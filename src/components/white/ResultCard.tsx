"use client";

import { motion } from "framer-motion";
import { ExternalLink, MoreHorizontal, ShieldCheck } from "lucide-react";
import { useWhite } from "@/lib/store";
import type { SearchResultItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  item: SearchResultItem;
  index: number;
  query: string;
}

export function ResultCard({ item, index, query }: ResultCardProps) {
  const prefs = useWhite((s) => s.prefs);

  const onClick = () => {
    // learn — fire and forget
    fetch("/api/learn", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query,
        url: item.url,
        title: item.name,
        host: item.host_name,
        position: item.rank,
        category: item.category,
      }),
    }).catch(() => {});
  };

  const target = prefs.openNewTab ? "_blank" : "_self";
  const rel = prefs.openNewTab ? "noopener noreferrer" : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.03, 0.25), ease: [0.22, 1, 0.36, 1] }}
      className="ws-result px-4 py-4 md:px-5"
    >
      <div className="flex items-start gap-3">
        {/* favicon or letterbox */}
        {prefs.showFavicons ? (
          <FaviconOrLetter url={item.url} host={item.cleanHost} letter={item.letterbox} />
        ) : (
          <div className="ws-letterbox shrink-0">{item.letterbox}</div>
        )}

        <div className="min-w-0 flex-1">
          {/* host line */}
          <div className="flex items-center gap-2 text-xs text-foreground/55">
            <span className="truncate font-medium">{item.cleanHost}</span>
            {item.displayDate && (
              <>
                <span className="text-foreground/25">·</span>
                <span className="shrink-0">{item.displayDate}</span>
              </>
            )}
            {item.category !== "web" && (
              <span className="ws-pill ml-1" style={{ opacity: 0.7 }}>
                {item.category}
              </span>
            )}
          </div>

          {/* title */}
          <a
            href={item.url}
            target={target}
            rel={rel}
            onClick={onClick}
            className="mt-1 block text-[17px] font-medium leading-snug tracking-[-0.01em] hover:underline underline-offset-2 decoration-foreground/30"
            style={{ color: "var(--ws-accent)" }}
          >
            {item.name}
          </a>

          {/* snippet */}
          {item.snippet && (
            <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/70 line-clamp-3">
              {item.snippet}
            </p>
          )}

          {/* url footer */}
          <div className="mt-2 flex items-center gap-3">
            <span className="truncate text-[12px] text-foreground/40">{item.url}</span>
          </div>
        </div>

        <button
          type="button"
          className="ml-1 hidden shrink-0 rounded-full p-1.5 text-foreground/30 hover:bg-foreground/5 hover:text-foreground/60 md:inline-flex"
          aria-label="More"
          onClick={(e) => e.preventDefault()}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}

function FaviconOrLetter({ url, host, letter }: { url: string; host: string; letter: string }) {
  // try google favicon service as a clean fallback (no tracking, just the icon)
  const fav = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  return (
    <div className="relative shrink-0">
      <img
        src={fav}
        alt=""
        width={28}
        height={28}
        loading="lazy"
        className="size-7 rounded-lg object-contain"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
          const sib = (e.currentTarget.nextElementSibling as HTMLElement) ?? null;
          if (sib) sib.style.display = "inline-flex";
        }}
      />
      <div className="ws-letterbox hidden" style={{ display: "none" }}>
        {letter}
      </div>
    </div>
  );
}

export function ResultSkeleton() {
  return (
    <div className="px-4 py-4 md:px-5">
      <div className="flex items-start gap-3">
        <div className="ws-skeleton size-7 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="ws-skeleton h-3 w-32" />
          <div className="ws-skeleton h-4 w-3/4" />
          <div className="ws-skeleton h-3 w-full" />
          <div className="ws-skeleton h-3 w-5/6" />
          <div className="ws-skeleton h-2.5 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function EmptyResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div
        className="mb-5 flex size-14 items-center justify-center rounded-2xl"
        style={{ background: "var(--ws-accent-soft)" }}
      >
        <ShieldCheck className="size-7" style={{ color: "var(--ws-accent)" }} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-medium tracking-tight">No results for &ldquo;{query}&rdquo;</h3>
      <p className="mt-2 max-w-sm text-sm text-foreground/55">
        The open web didn&rsquo;t return anything clean. Try different words, check spelling, or
        switch categories above.
      </p>
    </div>
  );
}

export function ResultList({
  items,
  loading,
  query,
}: {
  items: SearchResultItem[];
  loading: boolean;
  query: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <ResultSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return <EmptyResults query={query} />;
  }
  return (
    <div className="flex flex-col">
      {items.map((item, i) => (
        <ResultCard key={item.id} item={item} index={i} query={query} />
      ))}
      <div className="px-5 py-6 text-center">
        <p className="text-xs text-foreground/40">
          End of clean results. No infinite scroll. No sponsored content. No tracking.
        </p>
      </div>
    </div>
  );
}
