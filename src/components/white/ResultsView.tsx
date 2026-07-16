"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark, Info, Keyboard, Sliders, Sparkles } from "lucide-react";
import { SearchBox, type SearchBoxHandle } from "./SearchBox";
import { WhiteLogo } from "./WhiteLogo";
import { SearchTabs } from "./SearchTabs";
import { ResultList } from "./ResultCard";
import { Footer } from "./Footer";
import { HistoryPanel } from "./HistoryPanel";
import { ReadingPane } from "./ReadingPane";
import { ImageGrid } from "./ImageGrid";
import { RelatedSearches } from "./RelatedSearches";
import { Pagination } from "./Pagination";
import { ShareButton } from "./ShareButton";
import { FiltersButton } from "./FiltersButton";
import { useWhite } from "@/lib/store";
import type { SearchCategory, SearchResponse, SearchResultItem } from "@/lib/types";
import { InstantAnswerCard, type InstantAnswerData } from "./InstantAnswerCard";
import { TimeRangeFilter, TIME_RANGE_DAYS, type TimeRange } from "./TimeRangeFilter";
import { cn } from "@/lib/utils";

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
    const setShowDomainRules = useWhite((s) => s.setShowDomainRules);
    const bookmarkCount = useWhite((s) => s.bookmarks.length);
    const domainRuleCount = useWhite((s) => s.domainRules.length);
    const focusedIndex = useWhite((s) => s.focusedIndex);
    const setFocusedIndex = useWhite((s) => s.setFocusedIndex);
    const preview = useWhite((s) => s.preview);
    const setPreview = useWhite((s) => s.setPreview);
    const timeRange = useWhite((s) => s.timeRange);
    const setTimeRange = useWhite((s) => s.setTimeRange);

    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [meta, setMeta] = useState<{ tookMs: number; total: number; cached: boolean; hasMore?: boolean } | null>(null);
    const [instantAnswer, setInstantAnswer] = useState<InstantAnswerData | null>(null);
    const [related, setRelated] = useState<{ text: string; source: string }[]>([]);
    const [page, setPage] = useState(1);
    const pageSize = 15;
    const reqIdRef = useRef(0);
    const searchRef = useRef<SearchBoxHandle>(null);

    useImperativeHandle(ref, () => ({
      focusSearch: () => searchRef.current?.focus(),
    }));

    // fetch instant answer (math, unit, time, definition) alongside search
    useEffect(() => {
      if (!query.trim() || category !== "web") {
        setInstantAnswer(null);
        return;
      }
      let active = true;
      (async () => {
        try {
          const r = await fetch(`/api/answer?q=${encodeURIComponent(query)}`, { cache: "no-store" });
          const d = await r.json();
          if (active) setInstantAnswer(d.answer ?? null);
        } catch {
          if (active) setInstantAnswer(null);
        }
      })();
      return () => { active = false; };
    }, [query, category]);

    // fetch related searches ("people also search")
    useEffect(() => {
      if (!query.trim() || category === "images") {
        setRelated([]);
        return;
      }
      let active = true;
      (async () => {
        try {
          const r = await fetch(`/api/related?q=${encodeURIComponent(query)}`, { cache: "no-store" });
          const d = await r.json();
          if (active) setRelated(d.related ?? []);
        } catch {
          if (active) setRelated([]);
        }
      })();
      return () => { active = false; };
    }, [query, category]);

    const prefs = useWhite((s) => s.prefs);
    const filterRegion = useWhite((s) => s.filterRegion);
    const filterLanguage = useWhite((s) => s.filterLanguage);

    // Client-side result cache for instant back/forward navigation
    const cacheRef = useRef<Map<string, { results: SearchResultItem[]; meta: { tookMs: number; total: number; cached: boolean; hasMore?: boolean } | null }>>(new Map());

    const runSearch = useCallback(async (q: string, c: SearchCategory, r?: TimeRange, p?: number) => {
      if (!q.trim()) return;
      const pageNum = p ?? 1;
      const range = r ?? timeRange;
      const algo = prefs.searchAlgorithm;
      // Check client cache first (include filters in key)
      const cacheKey = `${q}|${c}|${range}|${algo}|${pageNum}|${filterRegion}|${filterLanguage}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setResults(cached.results);
        setMeta(cached.meta);
        setLoading(false);
        setError(null);
        setFocusedIndex(-1);
        return;
      }
      setLoading(true);
      setError(null);
      setFocusedIndex(-1);
      const myReq = ++reqIdRef.current;
      const days = range === "all" ? "" : `&r=${TIME_RANGE_DAYS[range]}`;
      const algoParam = `&a=${algo}`;
      const pageParam = `&p=${pageNum}&num=${pageSize}`;
      const regionParam = filterRegion !== "all" ? `&region=${filterRegion}` : "";
      const langParam = filterLanguage !== "all" ? `&lang=${filterLanguage}` : "";
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&c=${c}${pageParam}${days}${algoParam}${regionParam}${langParam}`);
        const data = (await res.json()) as SearchResponse & { error?: string; hasMore?: boolean };
        if (myReq === reqIdRef.current) {
          if (!res.ok && data.error) {
            setError(
              data.error.includes("429") || data.error.includes("Too many requests")
                ? "The search service is busy. Please wait a moment and try again."
                : "Something went wrong. Please try again."
            );
            setResults([]);
            setMeta(null);
          } else {
            const newResults = data.results ?? [];
            const newMeta = { tookMs: data.tookMs, total: data.total, cached: data.cached, hasMore: data.hasMore };
            setResults(newResults);
            setMeta(newMeta);
            // Store in client cache (limit to 20 entries)
            cacheRef.current.set(cacheKey, { results: newResults, meta: newMeta });
            if (cacheRef.current.size > 20) {
              const firstKey = cacheRef.current.keys().next().value;
              if (firstKey) cacheRef.current.delete(firstKey);
            }
          }
        }
      } catch {
        if (myReq === reqIdRef.current) {
          setError("Network error. Please check your connection and try again.");
          setResults([]);
        }
      } finally {
        if (myReq === reqIdRef.current) setLoading(false);
      }
    }, [setFocusedIndex, timeRange, prefs.searchAlgorithm, filterRegion, filterLanguage]);

    useEffect(() => {
      setPage(1);
      runSearch(query, category, undefined, 1);
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

    // j/k navigation + pagination shortcuts (only when reading pane is closed)
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (preview) return; // reading pane handles its own nav
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
        if (loading || results.length === 0) return;

        if (e.key === "j" || (e.key === "ArrowDown" && !e.target)) {
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, results.length - 1));
        } else if (e.key === "k" || (e.key === "ArrowUp" && !e.target)) {
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && focusedIndex >= 0 && results[focusedIndex]) {
          // Enter on focused result opens reading mode
          e.preventDefault();
          setPreview({ item: results[focusedIndex], data: null, loading: true, error: null });
        } else if (e.key === "o" && focusedIndex >= 0 && results[focusedIndex]) {
          // 'o' opens the original page
          e.preventDefault();
          window.open(results[focusedIndex].url, "_blank", "noopener");
        } else if (e.key === "n" && meta?.hasMore) {
          // 'n' = next page
          e.preventDefault();
          const next = page + 1;
          setPage(next);
          runSearch(query, category, undefined, next);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else if (e.key === "p" && page > 1) {
          // 'p' = previous page
          e.preventDefault();
          const prev = page - 1;
          setPage(prev);
          runSearch(query, category, undefined, prev);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [preview, loading, results, focusedIndex, setFocusedIndex, setPreview, meta, page, query, category, runSearch]);

    const handleSubmit = (q: string) => onNewQuery(q);
    const handleTabChange = (c: SearchCategory) => onCategoryChange(c);

    return (
      <div className="ws-app">
        {/* Sticky header */}
        <header
          className="sticky top-0 z-40 ws-hairline-b backdrop-blur-xl"
          style={{ background: "color-mix(in srgb, var(--ws-bg) 85%, transparent)" }}
        >
          <div className="mx-auto max-w-3xl px-3 pt-3 pb-0 md:px-6">
            <div className="flex items-center gap-1.5 md:gap-3">
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

              {/* domain rules */}
              <button
                type="button"
                onClick={() => setShowDomainRules(true)}
                className="relative hidden size-9 shrink-0 items-center justify-center rounded-full hover:ws-whisper transition-colors sm:flex"
                aria-label="Domain ranking rules"
                title="Domain ranking"
              >
                <Sliders className="size-4" strokeWidth={1.75} />
                {domainRuleCount > 0 && (
                  <span
                    className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular-nums"
                    style={{ background: "var(--ws-accent)", color: "#fff" }}
                  >
                    {domainRuleCount > 99 ? "99+" : domainRuleCount}
                  </span>
                )}
              </button>
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
              <ShareButton query={query} category={category} />
              <FiltersButton />
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

            <div className="mt-2 ws-hairline-b -mx-3 md:-mx-6 px-3 md:px-6">
              <SearchTabs onChange={handleTabChange} />
            </div>
          </div>
        </header>

        {/* Meta bar */}
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {!loading && meta && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center gap-2 text-[12px] text-foreground/45"
              >
                <span>
                  <span className="font-semibold tabular-nums text-foreground/75">{meta.total}</span> clean results
                </span>
                {meta.tookMs > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="text-foreground/20">·</span>
                    <span className="tabular-nums font-medium" style={{ color: meta.tookMs < 500 ? "var(--ws-accent)" : undefined }}>
                      {(meta.tookMs / 1000).toFixed(2)}s
                    </span>
                  </span>
                )}
                {meta.cached && (
                  <span className="ws-pill" style={{ opacity: 0.7 }}>
                    <svg className="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                    cached
                  </span>
                )}
                {/* Algorithm indicator badge */}
                {category !== "images" && (
                  <button
                    type="button"
                    onClick={() => useWhite.getState().setShowSettings(true)}
                    className="ws-pill transition-opacity hover:opacity-100"
                    style={{ opacity: 0.85, cursor: "pointer" }}
                    title="Change search algorithm"
                  >
                    <Sparkles className="size-2.5" strokeWidth={2.5} />
                    {prefs.searchAlgorithm}
                  </button>
                )}
                {focusedIndex >= 0 && (
                  <span className="ml-1 text-foreground/35">
                    <kbd className="mr-1">{focusedIndex + 1}</kbd>· <kbd>j</kbd>/<kbd>k</kbd> navigate · <kbd>Enter</kbd> read · <kbd>o</kbd> open
                  </span>
                )}
              </motion.div>
            )}
            <TimeRangeFilter
              value={timeRange}
              onChange={(r) => {
                setTimeRange(r);
                runSearch(query, category, r);
              }}
              className="ml-auto"
            />
          </div>
          {error && (
            <p className="text-[13px]" style={{ color: "var(--destructive)" }}>
              {error}
            </p>
          )}
        </div>

        {/* Results */}
        <main className={cn(
          "mx-auto w-full flex-1 px-2 pb-10 md:px-6",
          category === "images" ? "max-w-6xl" : "max-w-3xl"
        )}>
          {/* Instant answer (math, unit, time, definition) — web only */}
          {instantAnswer && category === "web" && (
            <div className="mt-3">
              <InstantAnswerCard answer={instantAnswer} />
            </div>
          )}

          {category === "images" ? (
            <div className="mt-3">
              <ImageGrid items={results} loading={loading} query={query} />
            </div>
          ) : (
            <>
              <div className="mt-3 ws-hairline overflow-hidden rounded-2xl ws-surface">
                <ResultList
                  items={results}
                  loading={loading}
                  query={query}
                  focusedIndex={focusedIndex}
                  onTagClick={(tag) => handleSubmit(`${query} ${tag}`)}
                />
              </div>
              {/* Pagination + Load More */}
              {!loading && meta && meta.total > pageSize && (
                <>
                  <Pagination
                    page={page}
                    total={meta.total}
                    pageSize={pageSize}
                    loading={loading}
                    onPageChange={(p) => {
                      setPage(p);
                      runSearch(query, category, undefined, p);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                  {meta.hasMore && (
                    <div className="flex justify-center py-4">
                      <button
                        type="button"
                        onClick={() => {
                          const next = page + 1;
                          setPage(next);
                          runSearch(query, category, undefined, next);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl ws-hairline px-5 py-2.5 text-[13px] font-medium hover:ws-whisper transition-colors"
                      >
                        Load more results
                      </button>
                    </div>
                  )}
                </>
              )}
              {/* No "End of results" message — keep exploring */}
              {!loading && meta && meta.total > 0 && (
                <div className="py-4 text-center">
                  <p className="text-[11px] text-foreground/30">
                    Keep exploring — click{" "}
                    <span style={{ color: "var(--ws-accent)" }} className="font-medium">HyperTags</span>
                    {" "}below each result to go deeper.
                  </p>
                </div>
              )}
            </>
          )}

          {!loading && history.length > 0 && category !== "images" && (
            <div className="mt-8">
              <HistoryPanel onPick={handleSubmit} compact />
            </div>
          )}

          {/* Related searches */}
          {!loading && category !== "images" && related.length > 0 && (
            <RelatedSearches items={related} onPick={handleSubmit} />
          )}
        </main>

        <Footer />

        {/* Reading pane (slide-in) */}
        <ReadingPane
          items={results}
          onNavigate={(item) => setPreview({ item, data: null, loading: true, error: null })}
        />
      </div>
    );
  }
);
