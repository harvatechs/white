"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, Info, Keyboard } from "lucide-react";
import { SearchBox, type SearchBoxHandle } from "./SearchBox";
import { WhiteLogo } from "./WhiteLogo";
import { SearchTabs } from "./SearchTabs";
import { ResultList } from "./ResultCard";
import { Footer } from "./Footer";
import { HistoryPanel } from "./HistoryPanel";
import { useWhite } from "@/lib/store";
import type { SearchCategory, SearchResponse, SearchResultItem } from "@/lib/types";

interface ResultsViewProps {
  query: string;
  category: SearchCategory;
  onBack: () => void;
  onNewQuery: (q: string) => void;
  onCategoryChange: (c: SearchCategory) => void;
}

export interface ResultsViewHandle {
  focusSearch: () => void;
}

export const ResultsView = forwardRef<ResultsViewHandle, ResultsViewProps>(
  function ResultsView({ query, category, onBack, onNewQuery, onCategoryChange }, ref) {
    const history = useWhite((s) => s.history);
    const setShowAbout = useWhite((s) => s.setShowAbout);
    const setShowBookmarks = useWhite((s) => s.setShowBookmarks);
    const setShowShortcuts = useWhite((s) => s.setShowShortcuts);
    const bookmarkCount = useWhite((s) => s.bookmarks.length);

    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<{ tookMs: number; total: number; cached: boolean } | null>(null);
    const reqIdRef = useRef(0);
    const searchRef = useRef<SearchBoxHandle>(null);

    useImperativeHandle(ref, () => ({
      focusSearch: () => searchRef.current?.focus(),
    }));

    const runSearch = useCallback(async (q: string, c: SearchCategory) => {
      if (!q.trim()) return;
      setLoading(true);
      setError(null);
      const myReq = ++reqIdRef.current;
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&c=${c}&num=15`);
        const data = (await r.json()) as SearchResponse;
        if (myReq === reqIdRef.current) {
          setResults(data.results ?? []);
          setMeta({ tookMs: data.tookMs, total: data.total, cached: data.cached });
        }
      } catch {
        if (myReq === reqIdRef.current) {
          setError("Something went wrong. Please try again.");
          setResults([]);
        }
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, []);

    useEffect(() => {
      runSearch(query, category);
    }, [query, category, runSearch]);

    // refresh history after a search completes
    useEffect(() => {
      let active = true;
      if (!loading) {
        fetch("/api/history?limit=12", { cache: "no-store" })
          .then((r) => r.json())
          .then(
            (d: { history: { id: string; query: string; category: string; resultsCount: number; createdAt: string }[] }) => {
              if (!active) return;
              useWhite.getState().setHistory(
                d.history.map((h) => ({
                  id: h.id,
                  query: h.query,
                  category: h.category as SearchCategory,
                  resultsCount: h.resultsCount,
                  createdAt: h.createdAt,
                }))
              );
            }
          )
          .catch(() => {});
      }
      return () => {
        active = false;
      };
    }, [loading]);

    const handleSubmit = (q: string) => onNewQuery(q);
    const handleTabChange = (c: SearchCategory) => onCategoryChange(c);

    return (
      <div className="ws-app">
        {/* Sticky header */}
        <header
          className="sticky top-0 z-40 ws-hairline-b backdrop-blur-xl"
          style={{ background: "color-mix(in srgb, var(--ws-bg) 85%, transparent)" }}
        >
          <div className="mx-auto max-w-3xl px-4 pt-3 pb-0 md:px-6">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex size-9 shrink-0 items-center justify-center rounded-full hover:ws-whisper transition-colors"
                aria-label="Back to home"
              >
                <ArrowLeft className="size-4" strokeWidth={1.75} />
              </button>
              <WhiteLogo size="sm" showDot={false} onClick={onBack} className="hidden md:inline-flex" />
              <SearchBox ref={searchRef} size="md" onSubmit={handleSubmit} className="flex-1" />
              <button
                type="button"
                onClick={() => setShowBookmarks(true)}
                className="relative flex size-9 shrink-0 items-center justify-center rounded-full hover:ws-whisper transition-colors"
                aria-label="Bookmarks"
              >
                <Bookmark className="size-4" strokeWidth={1.75} />
                {bookmarkCount > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular-nums"
                    style={{ background: "var(--ws-accent)", color: "#fff" }}
                  >
                    {bookmarkCount > 99 ? "99+" : bookmarkCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="hidden size-9 shrink-0 items-center justify-center rounded-full hover:ws-whisper transition-colors sm:flex"
                aria-label="Keyboard shortcuts"
              >
                <Keyboard className="size-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => setShowAbout(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full hover:ws-whisper transition-colors"
                aria-label="About"
              >
                <Info className="size-4" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mt-2 ws-hairline-b -mx-4 md:-mx-6 px-4 md:px-6">
              <SearchTabs onChange={handleTabChange} />
            </div>
          </div>
        </header>

        {/* Meta bar */}
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-4">
          {!loading && meta && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[12px] text-foreground/45"
            >
              About <span className="font-medium text-foreground/70">{meta.total}</span> clean results
              {meta.tookMs > 0 && <> · {(meta.tookMs / 1000).toFixed(2)}s</>}
              {meta.cached && (
                <span className="ws-pill ml-2" style={{ opacity: 0.7 }}>
                  cached
                </span>
              )}
            </motion.p>
          )}
          {error && (
            <p className="text-[13px]" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}
        </div>

        {/* Results */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-2 pb-10 md:px-6">
          <div className="mt-3 ws-hairline overflow-hidden rounded-2xl ws-surface">
            <ResultList items={results} loading={loading} query={query} />
          </div>

          {!loading && history.length > 0 && (
            <div className="mt-8">
              <HistoryPanel onPick={handleSubmit} compact />
            </div>
          )}
        </main>

        <Footer />
      </div>
    );
  }
);
