"use client";

import { useEffect } from "react";
import { useWhite, DEFAULT_PREFS } from "@/lib/store";
import { applyTheme } from "@/lib/themes";
import type { BookmarkItem, HistoryItem, PopularHost, PopularQuery, UserPreferences } from "@/lib/types";

export function Boot() {
  const setPrefsFull = useWhite((s) => s.setPrefsFull);
  const setHistory = useWhite((s) => s.setHistory);
  const setBookmarks = useWhite((s) => s.setBookmarks);
  const setPopular = useWhite((s) => s.setPopular);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // hydrate preferences
      try {
        const r = await fetch("/api/preferences", { cache: "no-store" });
        const data = (await r.json()) as { prefs: UserPreferences };
        if (mounted && data.prefs) {
          setPrefsFull(data.prefs);
          applyTheme(data.prefs.theme, data.prefs.accent, data.prefs.density, data.prefs.fontScale, data.prefs.customAccent);
        }
      } catch {
        if (mounted) {
          setPrefsFull({ ...DEFAULT_PREFS, sessionId: "anon" });
          applyTheme(DEFAULT_PREFS.theme, DEFAULT_PREFS.accent, DEFAULT_PREFS.density, DEFAULT_PREFS.fontScale, DEFAULT_PREFS.customAccent);
        }
      }

      // hydrate history + bookmarks + popular + domain rules in parallel
      const [histRes, bmRes, popRes, domRes] = await Promise.allSettled([
        fetch("/api/history?limit=20", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/bookmarks", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/popular", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/domains", { cache: "no-store" }).then((r) => r.json()),
      ]);

      if (mounted && histRes.status === "fulfilled") {
        const hd = histRes.value as { history: { id: string; query: string; category: string; resultsCount: number; createdAt: string; clicked?: boolean }[] };
        if (hd.history) {
          setHistory(
            hd.history.map((h) => ({
              id: h.id,
              query: h.query,
              category: h.category as HistoryItem["category"],
              resultsCount: h.resultsCount,
              createdAt: h.createdAt,
              clicked: h.clicked,
            }))
          );
        }
      }

      if (mounted && bmRes.status === "fulfilled") {
        const bd = bmRes.value as { bookmarks: BookmarkItem[] };
        if (bd.bookmarks) setBookmarks(bd.bookmarks);
      }

      if (mounted && popRes.status === "fulfilled") {
        const pd = popRes.value as { topQueries: PopularQuery[]; topHosts: PopularHost[] };
        setPopular(pd.topQueries ?? [], pd.topHosts ?? []);
      }

      if (mounted && domRes.status === "fulfilled") {
        const dd = domRes.value as { rules: { id: string; host: string; action: "raise" | "lower" | "block"; updatedAt: string }[] };
        if (dd.rules) {
          useWhite.getState().setDomainRules(
            dd.rules.map((r) => ({ id: r.id, host: r.host, action: r.action, updatedAt: r.updatedAt }))
          );
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [setPrefsFull, setHistory, setBookmarks, setPopular]);

  return null;
}
