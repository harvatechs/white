// WHITE Search — /api/search
import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/search";
import { learnQuery, ensureSeed } from "@/lib/markov";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import type { SearchAlgorithm, SearchCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: SearchCategory[] = ["web", "news", "images", "videos"];
const VALID_ALGOS: SearchAlgorithm[] = ["relevance", "recency", "diverse", "markov", "alphabetical"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const category = (sp.get("c") as SearchCategory) || "web";
  const num = Math.min(parseInt(sp.get("num") ?? "12", 10) || 12, 30);
  const page = Math.max(1, parseInt(sp.get("p") ?? "1", 10) || 1);
  const recency = sp.get("r");
  const recencyDays = recency ? parseInt(recency, 10) : undefined;
  const algo = (sp.get("a") as SearchAlgorithm) || "relevance";

  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });
  if (!VALID.includes(category)) return NextResponse.json({ error: "bad category" }, { status: 400 });

  try {
    await ensureSeed();
    // Fetch more results for pagination (page * num, capped at 30)
    const fetchNum = Math.min(page * num, 30);
    const res = await runSearch(q, category, fetchNum, recencyDays && recencyDays > 0 ? recencyDays : undefined);

    const sessionId = await getOrCreateSessionId();

    // Apply per-session domain rules: block removes, raise/lower re-sorts
    const rules = await db.domainRule.findMany({ where: { sessionId } }).catch(() => [] as { host: string; action: string }[]);
    if (rules.length > 0) {
      const ruleMap = new Map(rules.map((r) => [r.host.replace(/^www\./, ""), r.action] as [string, string]));
      res.results = res.results.filter((r) => ruleMap.get(r.cleanHost) !== "block");
      const domainScore = (host: string) => {
        const a = ruleMap.get(host);
        if (a === "raise") return -1;
        if (a === "lower") return 1;
        return 0;
      };
      res.results = [...res.results].sort((a, b) => domainScore(a.cleanHost) - domainScore(b.cleanHost));
      res.total = res.results.length;
    }

    // Apply the user's chosen search algorithm
    if (VALID_ALGOS.includes(algo)) {
      if (algo === "recency") {
        res.results = [...res.results].sort((a, b) => {
          const da = a.date && a.date !== "N/A" ? new Date(a.date).getTime() : 0;
          const db_ = b.date && b.date !== "N/A" ? new Date(b.date).getTime() : 0;
          return db_ - da;
        });
      } else if (algo === "alphabetical") {
        res.results = [...res.results].sort((a, b) => a.name.localeCompare(b.name));
      } else if (algo === "diverse") {
        // limit to 2 results per domain, then interleave
        const byDomain = new Map<string, typeof res.results>();
        for (const r of res.results) {
          const arr = byDomain.get(r.cleanHost) ?? [];
          if (arr.length < 2) arr.push(r);
          byDomain.set(r.cleanHost, arr);
        }
        const seen = new Set<string>();
        const diverse: typeof res.results = [];
        for (const r of res.results) {
          if (seen.has(r.url)) continue;
          const arr = byDomain.get(r.cleanHost) ?? [];
          if (arr.length > 0) {
            diverse.push(arr.shift()!);
            seen.add(diverse[diverse.length - 1].url);
          }
        }
        // append remaining
        for (const r of res.results) {
          if (!seen.has(r.url)) {
            diverse.push(r);
            seen.add(r.url);
          }
        }
        res.results = diverse;
      } else if (algo === "markov") {
        // boost domains the user has clicked before (people-powered relevance)
        const clicks = await db.searchClick.findMany({
          where: { query: { contains: q.toLowerCase() } },
          select: { host: true },
          take: 100,
        }).catch(() => []);
        const hostBoost = new Map<string, number>();
        for (const c of clicks) {
          const h = c.host.replace(/^www\./, "");
          hostBoost.set(h, (hostBoost.get(h) ?? 0) + 1);
        }
        if (hostBoost.size > 0) {
          res.results = [...res.results].sort((a, b) => {
            const sa = hostBoost.get(a.cleanHost) ?? 0;
            const sb = hostBoost.get(b.cleanHost) ?? 0;
            return sb - sa;
          });
        }
      }
      // "relevance" = leave as-is (SDK's natural ranking)
    }

    // learn from this query (Markov) + persist to history (dedupe consecutive identical)
    // Only learn on page 1 to avoid duplicate history entries
    if (page === 1) {
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
    }

    // Slice results for the requested page
    const startIdx = (page - 1) * num;
    const pageResults = res.results.slice(startIdx, startIdx + num);

    return NextResponse.json({
      ...res,
      results: pageResults,
      total: res.total,
      page,
      pageSize: num,
      hasMore: startIdx + num < res.results.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "search failed";
    console.error("[/api/search] error", e);
    return NextResponse.json({ error: msg, query: q, category, total: 0, results: [], tookMs: 0, cached: false }, { status: 500 });
  }
}
