"use client";

import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, BookOpen, MoreVertical, ArrowUp, ArrowDown, Ban, Star, ShieldCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useWhite } from "@/lib/store";
import type { BookmarkItem, DomainAction, SearchResultItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ResultPreview } from "./ResultPreview";
import { HyperTags, extractTags } from "./HyperTags";

interface ResultCardProps {
  item: SearchResultItem;
  index: number;
  query: string;
  focused?: boolean;
  onTagClick?: (tag: string) => void;
}

export function ResultCard({ item, index, query, focused, onTagClick }: ResultCardProps) {
  const tags = extractTags(item.name, item.snippet, item.cleanHost);
  const prefs = useWhite((s) => s.prefs);
  const isBookmarked = useWhite((s) => s.bookmarkUrls.has(item.url));
  const addBookmark = useWhite((s) => s.addBookmark);
  const removeBookmark = useWhite((s) => s.removeBookmark);
  const domainAction = useWhite((s) => s.domainRuleMap.get(item.cleanHost));
  const setDomainRule = useWhite((s) => s.setDomainRule);
  const removeDomainRule = useWhite((s) => s.removeDomainRule);
  const setPreview = useWhite((s) => s.setPreview);
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  // scroll focused card into view (j/k nav)
  useEffect(() => {
    if (focused && cardRef.current) {
      cardRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focused]);

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

  const toggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isBookmarked) {
      removeBookmark(item.url);
      fetch(`/api/bookmarks?url=${encodeURIComponent(item.url)}`, { method: "DELETE" }).catch(() => {});
    } else {
      const bm: BookmarkItem = {
        id: `tmp_${Date.now()}`,
        query,
        url: item.url,
        title: item.name,
        host: item.cleanHost,
        snippet: item.snippet,
        category: item.category,
        createdAt: new Date().toISOString(),
      };
      addBookmark(bm);
      fetch("/api/bookmarks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(bm),
      }).catch(() => {});
    }
  };

  const openReading = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreview({ item, data: null, loading: true, error: null });
  };

  const setRule = (action: DomainAction) => {
    setDomainRule(item.cleanHost, action);
    fetch("/api/domains", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ host: item.cleanHost, action }),
    }).catch(() => {});
    setMenuOpen(false);
    toast({
      title: `${action === "block" ? "Blocked" : action === "raise" ? "Raised" : "Lowered"} ${item.cleanHost}`,
      description: action === "block" ? "Future results from this site will be hidden." : "Ranking updated for your next search.",
    });
  };

  const clearRule = () => {
    removeDomainRule(item.cleanHost);
    fetch(`/api/domains?host=${encodeURIComponent(item.cleanHost)}`, { method: "DELETE" }).catch(() => {});
    setMenuOpen(false);
  };

  const target = prefs.openNewTab ? "_blank" : "_self";
  const rel = prefs.openNewTab ? "noopener noreferrer" : undefined;

  return (
    <ResultPreview item={item}>
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: Math.min(index * 0.03, 0.25), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "ws-result group relative px-4 py-4 md:px-5 transition-colors",
        focused && "ws-focused"
      )}
      data-focused={focused ? "true" : undefined}
    >
      {/* focus indicator bar */}
      {focused && (
        <span
          className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full"
          style={{ background: "var(--ws-accent)" }}
          aria-hidden
        />
      )}
      {/* domain rule indicator */}
      {domainAction && (
        <span
          className="absolute right-0 top-1/2 hidden h-8 w-[3px] -translate-y-1/2 rounded-l-full sm:block"
          style={{
            background: domainAction === "block" ? "var(--destructive)" : domainAction === "raise" ? "var(--ws-accent)" : "#8a8a8a",
            opacity: 0.5,
          }}
          aria-hidden
        />
      )}
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
            {domainAction && (
              <span
                className="ws-pill"
                style={{
                  opacity: 0.85,
                  background: domainAction === "block" ? "color-mix(in srgb, var(--destructive) 12%, transparent)" : domainAction === "raise" ? "var(--ws-accent-soft)" : "rgba(138,138,138,0.1)",
                  color: domainAction === "block" ? "var(--destructive)" : domainAction === "raise" ? "var(--ws-accent)" : "#6a6a6a",
                }}
              >
                {domainAction === "raise" && <ArrowUp className="size-2.5" strokeWidth={2.5} />}
                {domainAction === "lower" && <ArrowDown className="size-2.5" strokeWidth={2.5} />}
                {domainAction === "block" && <Ban className="size-2.5" strokeWidth={2.5} />}
                {domainAction}
              </span>
            )}
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
            <p className="mt-1.5 text-[14px] leading-[1.6] text-foreground/70 line-clamp-3">
              {item.snippet}
            </p>
          )}

          {/* HyperTags — keyword chips for deeper exploration */}
          <HyperTags tags={tags} onTagClick={onTagClick} />

          {/* action row: read + url */}
          <div className="mt-2.5 flex items-center gap-3">
            <button
              type="button"
              onClick={openReading}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-foreground/50 opacity-0 hover:text-foreground/80 group-hover:opacity-100 group-focus-within:opacity-100 transition-all"
              title="Read in WHITE (preview)"
            >
              <BookOpen className="size-3.5" strokeWidth={1.75} />
              Read
            </button>
            <span className="truncate text-[12px] text-foreground/35">{item.url}</span>
          </div>
        </div>

        {/* action buttons */}
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={toggleBookmark}
            className={cn(
              "rounded-full p-1.5 transition-all",
              isBookmarked
                ? "text-foreground/70 opacity-100"
                : "text-foreground/30 opacity-0 hover:bg-foreground/5 hover:text-foreground/60 group-hover:opacity-100 group-focus-within:opacity-100"
            )}
            aria-label={isBookmarked ? "Remove bookmark" : "Save bookmark"}
            aria-pressed={isBookmarked}
            title={isBookmarked ? "Remove bookmark" : "Save bookmark"}
          >
            {isBookmarked ? (
              <BookmarkCheck className="size-4" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
            ) : (
              <Bookmark className="size-4" strokeWidth={1.75} />
            )}
          </button>

          {/* ranking menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              className={cn(
                "rounded-full p-1.5 transition-all",
                menuOpen || domainAction
                  ? "text-foreground/70 opacity-100"
                  : "text-foreground/30 opacity-0 hover:bg-foreground/5 hover:text-foreground/60 group-hover:opacity-100 group-focus-within:opacity-100"
              )}
              aria-label="Ranking options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title="Rank this domain"
            >
              <MoreVertical className="size-4" strokeWidth={1.75} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="ws-surface absolute right-0 top-[calc(100%+4px)] z-50 w-44 overflow-hidden rounded-xl ws-hairline py-1 shadow-xl"
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}
              >
                <MenuItem icon={ArrowUp} label="Raise domain" onClick={() => setRule("raise")} active={domainAction === "raise"} />
                <MenuItem icon={ArrowDown} label="Lower domain" onClick={() => setRule("lower")} active={domainAction === "lower"} />
                <MenuItem icon={Ban} label="Block domain" onClick={() => setRule("block")} active={domainAction === "block"} danger />
                {domainAction && (
                  <>
                    <div className="my-1 ws-hairline-t" />
                    <MenuItem icon={Star} label="Clear rule" onClick={clearRule} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
    </ResultPreview>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  active,
  danger,
}: {
  icon: typeof ArrowUp;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:ws-whisper",
        active ? "font-medium" : "text-foreground/75",
        danger && "hover:text-foreground"
      )}
      style={active ? { color: danger ? "var(--destructive)" : "var(--ws-accent)" } : danger ? { color: "var(--destructive)" } : undefined}
    >
      <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
      {label}
      {active && <span className="ml-auto text-[10px] uppercase tracking-wide opacity-60">on</span>}
    </button>
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
  focusedIndex,
  onTagClick,
}: {
  items: SearchResultItem[];
  loading: boolean;
  query: string;
  focusedIndex?: number;
  onTagClick?: (tag: string) => void;
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
        <ResultCard key={item.id} item={item} index={i} query={query} focused={focusedIndex === i} onTagClick={onTagClick} />
      ))}
    </div>
  );
}
