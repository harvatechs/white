// WHITE Search — /api/preferences (GET + PUT, anonymous session)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId, setSessionCookie } from "@/lib/session";
import { DEFAULT_PREFS } from "@/lib/store";
import type { AccentName, Density, FontScale, SearchAlgorithm, UserPreferences, WhiteTheme } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_THEMES: WhiteTheme[] = ["pure","ivory","snow","pearl","alabaster","ghost","seashell","mint","midnight","charcoal","slate"];
const VALID_DENSITY: Density[] = ["comfortable","compact","airy"];
const VALID_FONT: FontScale[] = ["small","base","large"];
const VALID_ACCENT: AccentName[] = ["graphite","sage","rose","amber","slate"];
const VALID_ALGO: SearchAlgorithm[] = ["relevance","recency","diverse","markov","alphabetical"];

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  try {
    const row = await db.preferences.findUnique({ where: { sessionId } });
    const prefs: UserPreferences = row
      ? {
          sessionId: row.sessionId,
          theme: (row.theme as WhiteTheme) || DEFAULT_PREFS.theme,
          density: (row.density as Density) || DEFAULT_PREFS.density,
          fontScale: (row.fontScale as FontScale) || DEFAULT_PREFS.fontScale,
          safeSearch: row.safeSearch,
          openNewTab: row.openNewTab,
          showFavicons: row.showFavicons,
          markovEnabled: row.markovEnabled,
          suggestionCount: row.suggestionCount,
          accent: (row.accent as AccentName) || DEFAULT_PREFS.accent,
          customAccent: row.customAccent ?? null,
          searchAlgorithm: (VALID_ALGO.includes(row.searchAlgorithm as SearchAlgorithm) ? row.searchAlgorithm : DEFAULT_PREFS.searchAlgorithm) as SearchAlgorithm,
        }
      : { ...DEFAULT_PREFS, sessionId };

    const res = NextResponse.json({ prefs });
    return setSessionCookie(res, sessionId);
  } catch (e) {
    console.error("[/api/preferences] GET error", e);
    const res = NextResponse.json({ prefs: { ...DEFAULT_PREFS, sessionId } });
    return setSessionCookie(res, sessionId);
  }
}

export async function PUT(req: NextRequest) {
  const sessionId = await getOrCreateSessionId();
  try {
    const body = await req.json();
    const data = {
      sessionId,
      theme: VALID_THEMES.includes(body.theme) ? body.theme : DEFAULT_PREFS.theme,
      density: VALID_DENSITY.includes(body.density) ? body.density : DEFAULT_PREFS.density,
      fontScale: VALID_FONT.includes(body.fontScale) ? body.fontScale : DEFAULT_PREFS.fontScale,
      safeSearch: typeof body.safeSearch === "boolean" ? body.safeSearch : DEFAULT_PREFS.safeSearch,
      openNewTab: typeof body.openNewTab === "boolean" ? body.openNewTab : DEFAULT_PREFS.openNewTab,
      showFavicons: typeof body.showFavicons === "boolean" ? body.showFavicons : DEFAULT_PREFS.showFavicons,
      markovEnabled: typeof body.markovEnabled === "boolean" ? body.markovEnabled : DEFAULT_PREFS.markovEnabled,
      suggestionCount: Math.min(Math.max(parseInt(body.suggestionCount, 10) || DEFAULT_PREFS.suggestionCount, 3), 15),
      accent: VALID_ACCENT.includes(body.accent) ? body.accent : DEFAULT_PREFS.accent,
      customAccent: typeof body.customAccent === "string" && /^#[0-9a-f]{6}$/i.test(body.customAccent) ? body.customAccent : null,
      searchAlgorithm: VALID_ALGO.includes(body.searchAlgorithm) ? body.searchAlgorithm : DEFAULT_PREFS.searchAlgorithm,
    };

    const row = await db.preferences.upsert({
      where: { sessionId },
      create: data,
      update: data,
    });

    const res = NextResponse.json({ ok: true, prefs: { ...data, sessionId: row.sessionId } });
    return setSessionCookie(res, sessionId);
  } catch (e) {
    console.error("[/api/preferences] PUT error", e);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
