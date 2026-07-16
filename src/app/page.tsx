"use client";

import { useCallback, useEffect, useRef } from "react";
import { useWhite } from "@/lib/store";
import { Boot } from "@/components/white/Boot";
import { HomeView } from "@/components/white/HomeView";
import { ResultsView, type ResultsViewHandle } from "@/components/white/ResultsView";
import { AboutDialog } from "@/components/white/AboutDialog";
import { SettingsSheet } from "@/components/white/SettingsSheet";
import { ShortcutsHelp } from "@/components/white/ShortcutsHelp";
import { MarkovInspector } from "@/components/white/MarkovInspector";
import { BookmarksDialog } from "@/components/white/BookmarksDialog";
import { DomainRulesDialog } from "@/components/white/DomainRulesDialog";
import { StatsDialog } from "@/components/white/StatsDialog";
import { CommandPalette } from "@/components/white/CommandPalette";
import { InstallBanner } from "@/components/white/InstallBanner";
import { HistoryTimeline } from "@/components/white/HistoryTimeline";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { SearchCategory } from "@/lib/types";

const VALID_CATS: SearchCategory[] = ["web", "news", "images", "videos"];

export default function Page() {
  const view = useWhite((s) => s.view);
  const setView = useWhite((s) => s.setView);
  const query = useWhite((s) => s.query);
  const setQuery = useWhite((s) => s.setQuery);
  const category = useWhite((s) => s.category);
  const setCategory = useWhite((s) => s.setCategory);

  const resultsRef = useRef<ResultsViewHandle>(null);

  // sync from URL on mount (and on back/forward)
  useEffect(() => {
    const apply = () => {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get("q") ?? "";
      const c = sp.get("c") as SearchCategory | null;
      if (q.trim()) {
        setQuery(q);
        if (c && VALID_CATS.includes(c)) setCategory(c);
        setView("results");
      } else {
        setView("home");
      }
    };
    apply();
    window.addEventListener("popstate", apply);
    return () => window.removeEventListener("popstate", apply);
  }, [setQuery, setCategory, setView]);

  const pushUrl = useCallback(
    (q: string, c: SearchCategory) => {
      const url = new URL(window.location.href);
      if (q.trim()) {
        url.searchParams.set("q", q.trim());
        url.searchParams.set("c", c);
      } else {
        url.searchParams.delete("q");
        url.searchParams.delete("c");
      }
      window.history.pushState({}, "", url.toString());
    },
    []
  );

  const handleSubmit = useCallback(
    (q: string) => {
      setQuery(q);
      setView("results");
      pushUrl(q, category);
      window.scrollTo({ top: 0 });
    },
    [setQuery, setView, pushUrl, category]
  );

  const handleNewQuery = useCallback(
    (q: string) => {
      setQuery(q);
      pushUrl(q, category);
      window.scrollTo({ top: 0 });
    },
    [setQuery, pushUrl, category]
  );

  const handleBack = useCallback(() => {
    setView("home");
    setQuery("");
    pushUrl("", category);
    window.scrollTo({ top: 0 });
  }, [setView, setQuery, pushUrl, category]);

  const handleCategoryChange = useCallback(
    (c: SearchCategory) => {
      setCategory(c);
      pushUrl(query, c);
      window.scrollTo({ top: 0 });
    },
    [setCategory, pushUrl, query]
  );

  // keyboard shortcuts
  useKeyboardShortcuts({
    onHome: handleBack,
    onFocusSearch: () => resultsRef.current?.focusSearch(),
  });

  return (
    <>
      <Boot />
      {view === "results" && query.trim() ? (
        <ResultsView
          ref={resultsRef}
          query={query}
          category={category}
          onBack={handleBack}
          onNewQuery={handleNewQuery}
          onCategoryChange={handleCategoryChange}
        />
      ) : (
        <HomeView onSubmit={handleSubmit} />
      )}
      <AboutDialog />
      <SettingsSheet />
      <ShortcutsHelp />
      <MarkovInspector />
      <BookmarksDialog onPick={handleSubmit} />
      <DomainRulesDialog />
      <StatsDialog />
      <CommandPalette onSearch={handleSubmit} onGoHome={handleBack} />
      <InstallBanner />
      <HistoryTimeline onPick={handleSubmit} />
    </>
  );
}
