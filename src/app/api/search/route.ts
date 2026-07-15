// WHITE Search — /api/search
import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/search";
import { learnQuery, ensureSeed } from "@/lib/markov";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import type { SearchCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: SearchCategory[] = ["web", "news", "images", "videos"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const category = (sp.get("c") as SearchCategory) || "web";
  const num = Math.min(parseInt(sp.get("num") ?? "12", 10) || 12, 30);

  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });
  if (!VALID.includes(category)) return NextResponse.json({ error: "bad category" }, { status: 400 });

  try {
    await ensureSeed();
    const res = await runSearch(q, category, num);

    // Apply per-session domain rules: block removes, raise/lower re-sorts
    const sessionId = await getOrCreateSessionId();
    const rules = await db.domainRule.findMany({ where: { sessionId } }).catch(() => []);
    if (rules.length > 0) {
      const ruleMap = new Map(rules.map((r) => [r.host.replace(/^www\./, ""), r.action]));
      let filtered = res.results.filter((r) => {
        const action = ruleMap.get(r.cleanHost);
        return action !== "block";
      });
      // stable sort: raised first, lowered last
      const score = (host: string) => {
        const a = ruleMap.get(host);
        if (a === "raise") return -1;
        if (a === "lower") return 1;
        return 0;
      };
      filtered = [...filtered].sort((a, b) => score(a.cleanHost) - score(b.cleanHost));
      res.results = filtered;
      res.total = filtered.length;
    }

    // learn from this query (Markov) + persist to history (dedupe consecutive identical)
    await learnQuery(q).catch(() => {});
    const last = await db.searchHistory.findFirst({
      orderBy: { createdAt: "desc" },
      select: { query: true, category: true },
    });
    const isDupe = last?.query === q && last?.category === category;
    if (!isDupe) {
      await db.searchHistory
        .create({ data: { query: q, category, resultsCount: res.total } })
        .catch(() => {});
    }

    return NextResponse.json(res);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "search failed";
    console.error("[/api/search] error", e);
    return NextResponse.json({ error: msg, query: q, category, total: 0, results: [], tookMs: 0, cached: false }, { status: 500 });
  }
}
