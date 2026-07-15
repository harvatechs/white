"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Loader2, BookOpen, Clock, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";
import { useWhite } from "@/lib/store";
import type { SearchResultItem } from "@/lib/types";
import { useEffect, useCallback } from "react";

interface ReadingPaneProps {
  items: SearchResultItem[];
  onNavigate: (item: SearchResultItem) => void;
}

export function ReadingPane({ items, onNavigate }: ReadingPaneProps) {
  const preview = useWhite((s) => s.preview);
  const setPreview = useWhite((s) => s.setPreview);
  const prefs = useWhite((s) => s.prefs);

  const close = useCallback(() => setPreview(null), [setPreview]);

  // load preview when item changes
  useEffect(() => {
    if (!preview?.item) return;
    let active = true;
    const url = preview.item.url;
    setPreview({ item: preview.item, data: null, loading: true, error: null });
    (async () => {
      try {
        const r = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
        const d = await r.json();
        if (active) {
          if (d.error) {
            setPreview({ item: preview.item, data: null, loading: false, error: d.error });
          } else {
            setPreview({ item: preview.item, data: d, loading: false, error: null });
          }
        }
      } catch {
        if (active) setPreview({ item: preview.item, data: null, loading: false, error: "Failed to load preview" });
      }
    })();
    return () => {
      active = false;
    };
  }, [preview?.item?.url]);

  // keyboard nav within pane: j/k to move, Esc to close
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (!preview.item) return;
      const idx = items.findIndex((x) => x.url === preview.item!.url);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = items[Math.min(idx + 1, items.length - 1)];
        if (next) onNavigate(next);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = items[Math.max(idx - 1, 0)];
        if (next) onNavigate(next);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, items, onNavigate, close]);

  return (
    <AnimatePresence>
      {preview && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
            onClick={close}
          />
          {/* pane */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 38 }}
            className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[640px] flex-col ws-surface ws-hairline-l shadow-2xl"
            style={{ borderLeft: "1px solid color-mix(in srgb, var(--ws-accent) 8%, transparent)" }}
            role="dialog"
            aria-label="Reading preview"
          >
            {/* header */}
            <header className="flex items-center gap-2 px-5 py-4 ws-hairline-b">
              <button
                type="button"
                onClick={() => {
                  const idx = items.findIndex((x) => x.url === preview.item!.url);
                  const prev = items[Math.max(idx - 1, 0)];
                  if (prev) onNavigate(prev);
                }}
                disabled={items.findIndex((x) => x.url === preview.item?.url) === 0}
                className="rounded-lg p-1.5 text-foreground/50 hover:ws-whisper hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Previous result"
              >
                <ChevronLeft className="size-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = items.findIndex((x) => x.url === preview.item!.url);
                  const next = items[Math.min(idx + 1, items.length - 1)];
                  if (next) onNavigate(next);
                }}
                disabled={items.findIndex((x) => x.url === preview.item?.url) === items.length - 1}
                className="rounded-lg p-1.5 text-foreground/50 hover:ws-whisper hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Next result"
              >
                <ChevronRight className="size-4" strokeWidth={1.75} />
              </button>
              <div className="ml-1 flex min-w-0 flex-1 items-center gap-2">
                <BookOpen className="size-4 shrink-0" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
                <span className="truncate text-[12px] font-medium text-foreground/60">
                  {preview.item?.cleanHost}
                </span>
                {preview.data?.cached && <span className="ws-pill" style={{ opacity: 0.6 }}>cached</span>}
              </div>
              <a
                href={preview.item?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg ws-hairline px-2.5 py-1.5 text-[12px] font-medium hover:ws-whisper transition-colors"
              >
                <ExternalLink className="size-3.5" strokeWidth={1.75} />
                <span className="hidden sm:inline">Open</span>
              </a>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1.5 text-foreground/50 hover:ws-whisper hover:text-foreground transition-colors"
                aria-label="Close reading mode"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </header>

            {/* body */}
            <div className="ws-scroll flex-1 overflow-y-auto px-6 py-6">
              {preview.loading && (
                <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
                  <Loader2 className="size-6 animate-spin mb-3" style={{ color: "var(--ws-accent)" }} />
                  <p className="text-[13px]">Reading the page…</p>
                </div>
              )}

              {!preview.loading && preview.error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <AlertCircle className="size-7 mb-3" style={{ color: "var(--destructive)" }} strokeWidth={1.5} />
                  <p className="text-[14px] font-medium">Couldn&rsquo;t fetch a clean preview</p>
                  <p className="mt-1 max-w-[300px] text-[12.5px] text-foreground/50">
                    Some sites block readers or require JavaScript. You can still open the original page.
                  </p>
                  <a
                    href={preview.item?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg ws-hairline px-3 py-2 text-[12.5px] font-medium hover:ws-whisper transition-colors"
                  >
                    <ExternalLink className="size-3.5" strokeWidth={1.75} />
                    Open original
                  </a>
                </div>
              )}

              {!preview.loading && preview.data && (
                <article className="ws-fade-up">
                  <h1 className="text-[22px] font-semibold leading-tight tracking-tight">
                    {preview.data.title || preview.item?.name}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-foreground/45">
                    <span>{preview.item?.cleanHost}</span>
                    {preview.data.publishedTime && (
                      <>
                        <span className="text-foreground/25">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" strokeWidth={1.75} />
                          {new Date(preview.data.publishedTime).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                      </>
                    )}
                    <span className="text-foreground/25">·</span>
                    <span>{preview.data.wordCount.toLocaleString()} words</span>
                  </div>

                  <div className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-[1.75] text-foreground/80">
                    {preview.data.text}
                  </div>

                  {preview.data.truncated && (
                    <div className="mt-6 rounded-xl ws-whisper p-4 text-center">
                      <p className="text-[12.5px] text-foreground/50">
                        Preview truncated for reading.{" "}
                        <a
                          href={preview.item?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline underline-offset-2"
                          style={{ color: "var(--ws-accent)" }}
                        >
                          Open the full page →
                        </a>
                      </p>
                    </div>
                  )}
                </article>
              )}
            </div>

            {/* footer hint */}
            <footer className="ws-hairline-t px-5 py-2.5 text-center text-[11px] text-foreground/35">
              <kbd>j</kbd> / <kbd>k</kbd> to navigate · <kbd>Esc</kbd> to close
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
