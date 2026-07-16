// WHITE Search — /api/export and /api/import (data portability)
// GET /api/export  -> { preferences, history, bookmarks, markovStats }
// POST /api/import <- same shape, merges into the current anonymous session
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import { DEFAULT_PREFS } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  try {
    const prefRow = await db.preferences.findUnique({ where: { sessionId } });
    const preferences = prefRow
      ? {
          theme: prefRow.theme,
          density: prefRow.density,
          fontScale: prefRow.fontScale,
          safeSearch: prefRow.safeSearch,
          openNewTab: prefRow.openNewTab,
          showFavicons: prefRow.showFavicons,
          markovEnabled: prefRow.markovEnabled,
          suggestionCount: prefRow.suggestionCount,
          accent: prefRow.accent,
        }
      : { ...DEFAULT_PREFS, sessionId: undefined };

    const history = await db.searchHistory.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
      select: { query: true, category: true, resultsCount: true, createdAt: true },
    });

    const bookmarks = await db.bookmark.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      select: { query: true, url: true, title: true, host: true, snippet: true, category: true, createdAt: true },
    });

    const markovStats = {
      nodes: await db.markovNode.count(),
      edges: await db.markovEdge.count(),
    };

    const payload = {
      app: "WHITE Search",
      version: 1,
      exportedAt: new Date().toISOString(),
      sessionId,
      preferences,
      history,
      bookmarks,
      markovStats,
    };

    const res = NextResponse.json(payload);
    res.headers.set("content-disposition", `attachment; filename="white-search-export-${Date.now()}.json"`);
    return res;
  } catch (e) {
    console.error("[/api/export] error", e);
    return NextResponse.json({ error: "export failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const sessionId = await getOrCreateSessionId();
  try {
    const body = await req.json();
    const { preferences, history, bookmarks } = body || {};
    let imported = { preferences: false, history: 0, bookmarks: 0 };

    if (preferences && typeof preferences === "object") {
      const data = {
        sessionId,
        theme: typeof preferences.theme === "string" ? preferences.theme : DEFAULT_PREFS.theme,
        density: typeof preferences.density === "string" ? preferences.density : DEFAULT_PREFS.density,
        fontScale: typeof preferences.fontScale === "string" ? preferences.fontScale : DEFAULT_PREFS.fontScale,
        safeSearch: typeof preferences.safeSearch === "boolean" ? preferences.safeSearch : DEFAULT_PREFS.safeSearch,
        openNewTab: typeof preferences.openNewTab === "boolean" ? preferences.openNewTab : DEFAULT_PREFS.openNewTab,
        showFavicons: typeof preferences.showFavicons === "boolean" ? preferences.showFavicons : DEFAULT_PREFS.showFavicons,
        markovEnabled: typeof preferences.markovEnabled === "boolean" ? preferences.markovEnabled : DEFAULT_PREFS.markovEnabled,
        suggestionCount: Number(preferences.suggestionCount) || DEFAULT_PREFS.suggestionCount,
        accent: typeof preferences.accent === "string" ? preferences.accent : DEFAULT_PREFS.accent,
      };
      await db.preferences.upsert({
        where: { sessionId },
        create: data,
        update: data,
      });
      imported.preferences = true;
    }

    if (Array.isArray(history)) {
      // import up to 200 most recent, skip dupes of last 20
      const recent = await db.searchHistory.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { query: true, category: true } });
      const seen = new Set(recent.map((r) => `${r.query}|${r.category}`));
      let n = 0;
      for (const h of history.slice(0, 200)) {
        const key = `${h.query}|${h.category}`;
        if (seen.has(key)) continue;
        seen.add(key);
        await db.searchHistory.create({
          data: {
            query: String(h.query ?? ""),
            category: String(h.category ?? "web"),
            resultsCount: Number(h.resultsCount ?? 0),
            createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
          },
        }).catch(() => {});
        n++;
      }
      imported.history = n;
    }

    if (Array.isArray(bookmarks)) {
      let n = 0;
      for (const b of bookmarks.slice(0, 200)) {
        if (!b.url) continue;
        await db.bookmark.upsert({
          where: { sessionId_url: { sessionId, url: String(b.url) } },
          create: {
            sessionId,
            query: String(b.query ?? ""),
            url: String(b.url),
            title: String(b.title ?? ""),
            host: String(b.host ?? ""),
            snippet: String(b.snippet ?? ""),
            category: String(b.category ?? "web"),
            createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
          },
          update: {},
        }).catch(() => {});
        n++;
      }
      imported.bookmarks = n;
    }

    return NextResponse.json({ ok: true, imported });
  } catch (e) {
    console.error("[/api/import] error", e);
    return NextResponse.json({ ok: false, error: "import failed" }, { status: 500 });
  }
}
