"use client";

import { useEffect } from "react";
import { useWhite, DEFAULT_PREFS } from "@/lib/store";
import { applyTheme } from "@/lib/themes";
import type { UserPreferences } from "@/lib/types";

export function Boot() {
  const setPrefsFull = useWhite((s) => s.setPrefsFull);
  const setHistory = useWhite((s) => s.setHistory);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // hydrate preferences
        const r = await fetch("/api/preferences", { cache: "no-store" });
        const data = (await r.json()) as { prefs: UserPreferences };
        if (mounted && data.prefs) {
          setPrefsFull(data.prefs);
          applyTheme(data.prefs.theme, data.prefs.accent);
        }
      } catch {
        if (mounted) {
          setPrefsFull({ ...DEFAULT_PREFS, sessionId: "anon" });
          applyTheme(DEFAULT_PREFS.theme, DEFAULT_PREFS.accent);
        }
      }

      // hydrate history
      try {
        const hr = await fetch("/api/history?limit=20", { cache: "no-store" });
        const hd = (await hr.json()) as { history: { id: string; query: string; category: string; resultsCount: number; createdAt: string; clicked?: boolean }[] };
        if (mounted && hd.history) {
          setHistory(
            hd.history.map((h) => ({
              id: h.id,
              query: h.query,
              category: h.category as "web" | "news" | "images" | "videos",
              resultsCount: h.resultsCount,
              createdAt: h.createdAt,
            }))
          );
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      mounted = false;
    };
  }, [setPrefsFull, setHistory]);

  return null;
}
