// WHITE Search — /api/popular
// Returns the most-searched queries (aggregated from SearchHistory) + most-clicked hosts.
// This is the "of the people" feed — built entirely from (anonymous) usage.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // top queries by count (last 500 entries considered)
    const recent = await db.searchHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { query: true, category: true },
    });

    const counts = new Map<string, number>();
    for (const r of recent) {
      const key = r.query.toLowerCase().trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const topQueries = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([query, count]) => ({ query, count }));

    // top clicked hosts
    const clicks = await db.searchClick.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { host: true },
    });
    const hostCounts = new Map<string, number>();
    for (const c of clicks) {
      const h = c.host.replace(/^www\./, "");
      if (!h) continue;
      hostCounts.set(h, (hostCounts.get(h) ?? 0) + 1);
    }
    const topHosts = Array.from(hostCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([host, count]) => ({ host, count }));

    return NextResponse.json({ topQueries, topHosts });
  } catch (e) {
    console.error("[/api/popular] error", e);
    return NextResponse.json({ topQueries: [], topHosts: [] });
  }
}
