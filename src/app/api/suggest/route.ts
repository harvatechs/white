// WHITE Search — /api/suggest (Markov-powered autocomplete)
// Optimized with in-memory stale-while-revalidate cache for instant suggestions.
import { NextRequest, NextResponse } from "next/server";
import { suggest, ensureSeed } from "@/lib/markov";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory cache: stale-while-revalidate pattern
// Returns stale data immediately (0ms), refreshes in background
const sugCache = new Map<string, { data: { suggestions: unknown[] }; at: number }>();
const SUG_TTL = 1000 * 60 * 5; // 5 min fresh, 30 min stale

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const limit = Math.min(parseInt(sp.get("limit") ?? "8", 10) || 8, 15);

  if (!q) return NextResponse.json({ suggestions: [] });

  const cacheKey = `${q}|${limit}`;

  // Check cache — return immediately if fresh or stale
  const cached = sugCache.get(cacheKey);
  const age = cached ? Date.now() - cached.at : Infinity;

  if (cached && age < SUG_TTL) {
    // Fresh — return immediately
    const res = NextResponse.json(cached.data);
    res.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return res;
  }

  if (cached && age < SUG_TTL * 6) {
    // Stale — return immediately, refresh in background
    const res = NextResponse.json(cached.data);
    res.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=300");
    // Background refresh (fire-and-forget)
    refreshSuggestions(cacheKey, q, limit).catch(() => {});
    return res;
  }

  // No cache — fetch fresh
  try {
    ensureSeed().catch(() => {});
    const recent = await db.searchHistory.findMany({
      where: { query: { contains: q } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { query: true },
    });
    const hints = Array.from(new Set(recent.map((r) => r.query)));
    const suggestions = await suggest(q, limit, hints);
    const data = { suggestions };
    sugCache.set(cacheKey, { data, at: Date.now() });
    // Limit cache size
    if (sugCache.size > 200) {
      const firstKey = sugCache.keys().next().value;
      if (firstKey) sugCache.delete(firstKey);
    }
    const res = NextResponse.json(data);
    res.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return res;
  } catch (e) {
    console.error("[/api/suggest] error", e);
    return NextResponse.json({ suggestions: [] });
  }
}

// Background refresh function
async function refreshSuggestions(cacheKey: string, q: string, limit: number) {
  try {
    const recent = await db.searchHistory.findMany({
      where: { query: { contains: q } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { query: true },
    });
    const hints = Array.from(new Set(recent.map((r) => r.query)));
    const suggestions = await suggest(q, limit, hints);
    sugCache.set(cacheKey, { data: { suggestions }, at: Date.now() });
  } catch {
    // silent fail — background refresh
  }
}
