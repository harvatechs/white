// WHITE Search — /api/stats
// Aggregated search statistics for the user's anonymous session.
// Returns: total searches, category breakdown, click-through rate,
// recently visited hosts, searches over last 7 days (binned by day).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  try {
    const [history, clicks, bookmarks, domainRules] = await Promise.all([
      db.searchHistory.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      db.searchClick.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      db.bookmark.count({ where: { sessionId } }),
      db.domainRule.count({ where: { sessionId } }),
    ]);

    const totalSearches = history.length;
    const totalClicks = clicks.length;
    const clickThroughRate = totalSearches > 0 ? (clicks.filter((c) => c.query).length / totalSearches) * 100 : 0;

    // category breakdown
    const categoryCounts = new Map<string, number>();
    for (const h of history) {
      categoryCounts.set(h.category, (categoryCounts.get(h.category) ?? 0) + 1);
    }
    const categories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    // searches over last 7 days (binned by day)
    const now = new Date();
    const days: { date: string; label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = history.filter((h) => h.createdAt >= d && h.createdAt < next).length;
      days.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        count,
      });
    }

    // recently visited hosts (from clicks)
    const recentClicks = clicks.slice(0, 10).map((c) => ({
      host: c.host.replace(/^www\./, ""),
      title: c.title,
      url: c.url,
      query: c.query,
      visitedAt: c.createdAt.toISOString(),
    }));

    // unique queries
    const uniqueQueries = new Set(history.map((h) => h.query.toLowerCase().trim())).size;

    // top clicked hosts
    const hostCounts = new Map<string, number>();
    for (const c of clicks) {
      const h = c.host.replace(/^www\./, "");
      if (h) hostCounts.set(h, (hostCounts.get(h) ?? 0) + 1);
    }
    const topHosts = Array.from(hostCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([host, count]) => ({ host, count }));

    return NextResponse.json({
      totalSearches,
      totalClicks,
      uniqueQueries,
      clickThroughRate: Math.round(clickThroughRate * 10) / 10,
      bookmarks,
      domainRules,
      categories,
      days,
      recentlyVisited: recentClicks,
      topHosts,
    });
  } catch (e) {
    console.error("[/api/stats] error", e);
    return NextResponse.json({
      totalSearches: 0,
      totalClicks: 0,
      uniqueQueries: 0,
      clickThroughRate: 0,
      bookmarks: 0,
      domainRules: 0,
      categories: [],
      days: [],
      recentlyVisited: [],
      topHosts: [],
    });
  }
}
