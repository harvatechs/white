import { NextRequest, NextResponse } from "next/server";
import { runSearch } from "@/lib/search";
import { learnQuery, ensureSeed } from "@/lib/markov";
import { parseBang } from "@/lib/bangs";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import { searchRateLimiter, getClientIp } from "@/lib/rate-limit";
import type { SearchAlgorithm, SearchCategory, SearchResultItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: SearchCategory[] = ["web", "news", "images", "videos"];
const VALID_ALGOS: SearchAlgorithm[] = ["relevance", "recency", "diverse", "markov", "alphabetical"];

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rate = searchRateLimiter.check(clientIp);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many search requests. Please slow down." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.reset) },
      }
    );
  }

  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const category = (sp.get("c") as SearchCategory) || "web";
  const num = Math.min(parseInt(sp.get("num") ?? "12", 10) || 12, 30);
  const page = Math.max(1, parseInt(sp.get("p") ?? "1", 10) || 1);
  const recency = sp.get("r");
  const recencyDays = recency ? parseInt(recency, 10) : undefined;
  const algo = (sp.get("a") as SearchAlgorithm) || "relevance";
  const region = sp.get("region") || "all";
  const language = sp.get("lang") || "all";

  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });
  if (q.length > 500) return NextResponse.json({ error: "query too long (max 500 chars)" }, { status: 400 });
  if (!VALID.includes(category)) return NextResponse.json({ error: "bad category" }, { status: 400 });

  try {
    const sessionId = await getOrCreateSessionId();
    
    // Fetch preferences to get provider settings & custom bangs
    const prefs = await db.preferences.findUnique({ where: { sessionId } }).catch(() => null);
    let customBangs = [];
    try {
      const rawBangs = (prefs as unknown as { customBangs?: string | null })?.customBangs;
      if (rawBangs) {
        customBangs = JSON.parse(rawBangs);
      }
    } catch {}

    // Check for direct Bang shortcut (!w, !gh, !yt, etc.)
    const bangResult = parseBang(q, customBangs);
    if (bangResult.hasBang && bangResult.targetUrl) {
      return NextResponse.json({
        isBang: true,
        targetUrl: bangResult.targetUrl,
        bang: bangResult.bang,
        query: q,
      });
    }

    // Fire-and-forget seed check (non-blocking)
    ensureSeed().catch(() => {});

    // Apply region/language filters by modifying the query
    let searchQuery = q;
    if (region !== "all") {
      const regionSites: Record<string, string> = {
        us: "", uk: " site:.uk", in: " site:.in", ca: " site:.ca",
        au: " site:.au", de: " site:.de", fr: " site:.fr", jp: " site:.jp",
      };
      searchQuery = q + (regionSites[region] || "");
    }
    if (language !== "all") {
      const langNames: Record<string, string> = {
        en: " English", es: " Spanish", fr: " French", de: " German",
        ja: " Japanese", zh: " Chinese", hi: " Hindi",
      };
      searchQuery = searchQuery + (langNames[language] || "");
    }

    const searchProvider = (prefs?.searchProvider === "searxng" || prefs?.searchProvider === "local" ? prefs.searchProvider : "ddg") as "ddg" | "searxng" | "local";
    const searxngInstance = prefs?.searxngInstance || "https://searx.be";
    const localFirst = prefs?.localFirst ?? true;

    // Always request the max (30) so we have plenty of results for pagination + infinite scroll
    const fetchNum = 30;
    const res = await runSearch(
      searchQuery,
      category,
      fetchNum,
      recencyDays && recencyDays > 0 ? recencyDays : undefined,
      searchProvider,
      searxngInstance
    );

    // Apply per-session domain rules + learn Markov IN PARALLEL
    const [rules] = await Promise.all([
      db.domainRule.findMany({ where: { sessionId } }).catch(() => [] as { host: string; action: string }[]),
      learnQuery(q).catch(() => {}),
    ]);

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

    // Local-first search (on page 1 matches from bookmarks & history)
    const localResults: SearchResultItem[] = [];
    if (localFirst && page === 1) {
      try {
        const localBookmarks = await db.bookmark.findMany({
          where: {
            sessionId,
            OR: [
              { title: { contains: q } },
              { url: { contains: q } },
              { snippet: { contains: q } },
            ],
          },
          take: 5,
        });

        const localHistory = await db.searchHistory.findMany({
          where: {
            OR: [
              { query: { contains: q } },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        });

        for (const b of localBookmarks) {
          const cleanH = b.host.replace(/^www\./, "");
          localResults.push({
            id: `local-bookmark-${b.id}`,
            url: b.url,
            name: b.title,
            snippet: b.snippet || "Saved in your bookmarks",
            host_name: b.host,
            cleanHost: cleanH,
            rank: localResults.length + 1,
            date: b.createdAt.toISOString(),
            displayDate: "Bookmarked",
            favicon: `https://external-content.duckduckgo.com/ip3/${cleanH}.ico`,
            letterbox: (b.title || b.host || "?").trim().charAt(0).toUpperCase(),
            category: b.category as SearchCategory,
          });
        }

        const seenHistoryQueries = new Set<string>();
        for (const h of localHistory) {
          if (h.query.toLowerCase() === q.toLowerCase()) continue;
          if (seenHistoryQueries.has(h.query.toLowerCase())) continue;
          seenHistoryQueries.add(h.query.toLowerCase());

          localResults.push({
            id: `local-history-${h.id}`,
            url: `/?q=${encodeURIComponent(h.query)}&c=${h.category}`,
            name: `Search for "${h.query}"`,
            snippet: `Previous search from history under ${h.category}`,
            host_name: "local.history",
            cleanHost: "local.history",
            rank: localResults.length + 1,
            date: h.createdAt.toISOString(),
            displayDate: "History",
            favicon: "",
            letterbox: "H",
            category: h.category as SearchCategory,
          });
        }
      } catch (err) {
        console.error("Local search failed:", err);
      }
    }

    // Apply spam filter if enabled
    const spamFilterEnabled = prefs?.spamFilter ?? true;
    if (spamFilterEnabled) {
      const defaultSpam = [
        "pinterest.com", "pinterest.co.uk", "pinterest.ca", "pinterest.fr", "pinterest.de", "pinterest.it",
        "quora.com", "expertsexchange.com", "ezinearticles.com", "ehow.com", "answers.com", "clickbait.com"
      ];
      let customSpam: string[] = [];
      try {
        const rawSpam = (prefs as unknown as { customSpamDomains?: string | null })?.customSpamDomains;
        if (rawSpam) {
          customSpam = JSON.parse(rawSpam);
        }
      } catch {}
      const spamDomains = new Set([...defaultSpam, ...customSpam.map((d: string) => d.toLowerCase().trim())]);

      res.results = res.results.filter((r) => {
        const host = r.cleanHost.toLowerCase();
        for (const sd of spamDomains) {
          if (host === sd || host.endsWith("." + sd)) {
            return false;
          }
        }
        return true;
      });
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
        for (const r of res.results) {
          if (!seen.has(r.url)) {
            diverse.push(r);
            seen.add(r.url);
          }
        }
        res.results = diverse;
      } else if (algo === "markov") {
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
    }

    // Apply sliders algorithmic tuning
    const wRecency = prefs?.weightRecency ?? 0;
    const wDiversity = prefs?.weightDiversity ?? 0;
    const wPersonal = prefs?.weightPersonal ?? 0;

    if (wRecency > 0 || wDiversity > 0 || wPersonal > 0) {
      try {
        const clicks = await db.searchClick.findMany({
          where: { query: { contains: q.toLowerCase() } },
          select: { host: true },
          take: 100,
        }).catch(() => []);
        const clickedHosts = new Set(clicks.map(c => c.host.replace(/^www\./, "").toLowerCase()));

        const bookmarks = await db.bookmark.findMany({
          where: { sessionId },
          select: { host: true },
        }).catch(() => []);
        const bookmarkedHosts = new Set(bookmarks.map(b => b.host.replace(/^www\./, "").toLowerCase()));

        const scoredResults = res.results.map((r, index) => {
          const baseScore = 30 - index;

          let recencyScore = 0;
          if (r.date && r.date !== "N/A") {
            try {
              const ageDays = (Date.now() - new Date(r.date).getTime()) / (1000 * 3600 * 24);
              if (ageDays >= 0) {
                if (ageDays <= 30) recencyScore = 1.0;
                else if (ageDays <= 365) recencyScore = 0.6;
                else if (ageDays <= 730) recencyScore = 0.3;
                else recencyScore = 0.1;
              }
            } catch {}
          }

          const host = r.cleanHost.toLowerCase();
          let personalScore = 0;
          if (bookmarkedHosts.has(host)) {
            personalScore = 1.0;
          } else if (clickedHosts.has(host)) {
            personalScore = 0.5;
          }

          return {
            item: r,
            baseScore,
            recencyScore,
            personalScore,
          };
        });

        const scoredItems = scoredResults.map((item) => {
          const recencyContribution = item.recencyScore * (wRecency / 100) * 15;
          const personalContribution = item.personalScore * (wPersonal / 100) * 15;
          return {
            ...item,
            scoreBeforeDiversity: item.baseScore + recencyContribution + personalContribution,
          };
        });

        scoredItems.sort((a, b) => b.scoreBeforeDiversity - a.scoreBeforeDiversity);

        const domainSeenCount = new Map<string, number>();
        const finalScoredItems = scoredItems.map((item) => {
          const host = item.item.cleanHost.toLowerCase();
          const seenCount = domainSeenCount.get(host) ?? 0;
          domainSeenCount.set(host, seenCount + 1);

          const diversityPenalty = seenCount * (wDiversity / 100) * 8;
          return {
            item: item.item,
            finalScore: item.scoreBeforeDiversity - diversityPenalty,
          };
        });

        finalScoredItems.sort((a, b) => b.finalScore - a.finalScore);
        res.results = finalScoredItems.map((x) => x.item);
      } catch (err) {
        console.error("Algorithmic slider tuning failed:", err);
      }
    }

    // Slice results for the requested page
    const startIdx = (page - 1) * num;
    const pageResults = res.results.slice(startIdx, startIdx + num);

    // Persist to history (fire-and-forget, non-blocking)
    if (page === 1) {
      db.searchHistory.findFirst({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        select: { query: true, category: true },
      }).then((last) => {
        const isDupe = last?.query === q && last?.category === category;
        if (!isDupe) {
          return db.searchHistory.create({ data: { sessionId, query: q, category, resultsCount: res.total } });
        }
        return null;
      }).catch(() => {});
    }

    const response = NextResponse.json({
      ...res,
      results: pageResults,
      total: res.total,
      page,
      pageSize: num,
      hasMore: startIdx + num < res.results.length,
      localResults: page === 1 ? localResults : [],
    });

    // Add cache headers for CDN/browser caching (short for fresh, longer for cached)
    if (res.cached) {
      response.headers.set("Cache-Control", "public, max-age=300, s-maxage=600");
    } else {
      response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    }

    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "search failed";
    console.warn("[/api/search] Error during search execution:", e);
    return NextResponse.json(
      { error: msg, query: q, category, total: 0, results: [], localResults: [], tookMs: 0, cached: false },
      { status: 200 }
    );
  }
}
