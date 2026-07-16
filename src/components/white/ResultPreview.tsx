"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Globe, Loader2 } from "lucide-react";
import type { SearchResultItem } from "@/lib/types";

interface ResultPreviewProps {
  item: SearchResultItem;
  children: React.ReactNode;
}

interface PreviewData {
  title: string;
  text: string;
  wordCount: number;
}

// Shows a floating preview card when hovering over a result for 800ms+.
// Fetches a short excerpt from /api/preview (cached server-side).
export function ResultPreview({ item, children }: ResultPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const fetchPreview = useCallback(async () => {
    if (fetched || loading) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/preview?url=${encodeURIComponent(item.url)}`);
      const d = await r.json();
      if (!d.error) {
        setPreview({
          title: d.title || item.name,
          text: (d.text || "").slice(0, 300),
          wordCount: d.wordCount || 0,
        });
      }
      setFetched(true);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [item.url, item.name, fetched, loading]);

  const onMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setShowPreview(true);
      fetchPreview();
    }, 800);
  }, [fetchPreview]);

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowPreview(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}

      <AnimatePresence>
        {showPreview && (
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute left-0 top-full z-40 mt-1 w-80 overflow-hidden rounded-xl border border-foreground/8 backdrop-blur-xl"
            style={{
              background: "color-mix(in srgb, var(--ws-surface) 95%, transparent)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-foreground/6 px-3 py-2">
              <Globe className="size-3 shrink-0 text-foreground/35" strokeWidth={1.75} />
              <span className="truncate text-[11px] font-medium text-foreground/55">{item.cleanHost}</span>
              <span className="ml-auto shrink-0 text-[10px] text-foreground/30">
                {loading ? "loading…" : preview ? `${preview.wordCount} words` : ""}
              </span>
            </div>

            {/* Content */}
            <div className="max-h-48 overflow-y-auto ws-scroll px-3 py-2.5">
              {loading && !preview ? (
                <div className="flex items-center gap-2 py-3 text-foreground/40">
                  <Loader2 className="size-3.5 animate-spin" strokeWidth={1.75} />
                  <span className="text-[11px]">Fetching preview…</span>
                </div>
              ) : preview ? (
                <>
                  <p className="mb-1.5 text-[12px] font-semibold leading-tight text-foreground/80 line-clamp-2">
                    {preview.title}
                  </p>
                  <p className="text-[11.5px] leading-relaxed text-foreground/55 line-clamp-4">
                    {preview.text}
                  </p>
                </>
              ) : (
                <p className="py-2 text-[11px] text-foreground/35">
                  Preview unavailable.{" "}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
                    style={{ color: "var(--ws-accent)" }}
                  >
                    Open page <ExternalLink className="size-2.5" strokeWidth={2} />
                  </a>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
