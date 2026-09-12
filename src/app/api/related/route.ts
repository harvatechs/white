// WHITE Search — /api/related
// Returns "people also searched" related queries for a given query.
// Uses the Markov chain to find tokens that commonly co-occur, plus
// web search suggestions.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchOpenSuggestions } from "@/lib/open-apis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ related: [] });

  try {
    const related: { text: string; source: string }[] = [];
    const seen = new Set<string>();
    seen.add(q.toLowerCase());

    // 1) Markov + History in parallel (fast SQLite queries)
    const tokens = q.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
    const [markovEdges, history] = await Promise.all([
      // Get edges for all tokens at once
      db.markovEdge.findMany({
        where: { fromToken: { in: tokens.slice(0, 3) } },
        orderBy: { weight: "desc" },
        take: 15,
      }).catch(() => []),
      db.searchHistory.findMany({
        where: { query: { contains: tokens[0] ?? q } },
        take: 10,
        select: { query: true },
      }).catch(() => []),
    ]);

    for (const e of markovEdges) {
      const candidate = `${q} ${e.toToken}`.toLowerCase();
      if (!seen.has(candidate) && candidate !== q.toLowerCase()) {
        seen.add(candidate);
        related.push({ text: candidate, source: "markov" });
      }
    }

    for (const h of history) {
      const lower = h.query.toLowerCase();
      if (!seen.has(lower) && lower !== q.toLowerCase()) {
        seen.add(lower);
        related.push({ text: h.query, source: "history" });
      }
    }

    // 2) Fallback to open suggestions + web search if needed
    if (related.length < 4) {
      try {
        const openSug = await fetchOpenSuggestions(q, 6);
        for (const item of openSug) {
          const lower = item.toLowerCase();
          if (!seen.has(lower) && lower !== q.toLowerCase()) {
            seen.add(lower);
            related.push({ text: item, source: "popular" });
            if (related.length >= 6) break;
          }
        }
      } catch {}
    }



    const response = NextResponse.json({ related: related.slice(0, 8) });
    response.headers.set("Cache-Control", "public, max-age=120, s-maxage=300");
    return response;
  } catch (e) {
    console.error("[/api/related] error", e);
    return NextResponse.json({ related: [] });
  }
}
