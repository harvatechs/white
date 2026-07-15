// WHITE Search — /api/related
// Returns "people also searched" related queries for a given query.
// Uses the Markov chain to find tokens that commonly co-occur, plus
// web search suggestions.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ related: [] });

  try {
    const related: { text: string; source: string }[] = [];
    const seen = new Set<string>();
    seen.add(q.toLowerCase());

    // 1) Markov: find queries in history that share tokens with this query
    const tokens = q.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
    for (const token of tokens.slice(0, 3)) {
      const edges = await db.markovEdge.findMany({
        where: { fromToken: token },
        orderBy: { weight: "desc" },
        take: 5,
      }).catch(() => []);
      for (const e of edges) {
        const candidate = `${q} ${e.toToken}`.toLowerCase();
        if (!seen.has(candidate) && candidate !== q.toLowerCase()) {
          seen.add(candidate);
          related.push({ text: candidate, source: "markov" });
        }
      }
    }

    // 2) History: find other queries the user searched that share a token
    const history = await db.searchHistory.findMany({
      where: { query: { contains: tokens[0] ?? q } },
      take: 10,
      select: { query: true },
    }).catch(() => []);
    for (const h of history) {
      const lower = h.query.toLowerCase();
      if (!seen.has(lower) && lower !== q.toLowerCase()) {
        seen.add(lower);
        related.push({ text: h.query, source: "history" });
      }
    }

    // 3) Web search suggestions (append "vs", "how", "what", "best" patterns)
    // Best-effort — skip if rate-limited
    try {
      const zai = await getZai();
      const searchResults = (await zai.functions.invoke("web_search", {
        query: q,
        num: 5,
      })) as { name?: string; snippet?: string }[];
      // extract phrases from result titles
      for (const r of searchResults.slice(0, 3)) {
        const title = r.name ?? "";
        // look for "X vs Y" patterns
        const vsMatch = title.match(/vs\.?\s+([A-Za-z0-9\s]+)/i);
        if (vsMatch) {
          const candidate = `${q} vs ${vsMatch[1].trim().split(/\s+/).slice(0, 3).join(" ")}`.toLowerCase();
          if (!seen.has(candidate)) {
            seen.add(candidate);
            related.push({ text: candidate, source: "web" });
          }
        }
      }
    } catch {
      // web search is best-effort — rate limits are expected
    }

    return NextResponse.json({ related: related.slice(0, 8) });
  } catch (e) {
    console.error("[/api/related] error", e);
    return NextResponse.json({ related: [] });
  }
}
