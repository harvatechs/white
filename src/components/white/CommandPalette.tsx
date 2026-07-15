"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWhite } from "@/lib/store";
import {
  Search,
  Bookmark,
  Network,
  Sliders,
  BarChart3,
  Settings,
  Info,
  Keyboard,
  BookOpen,
  Home,
  ArrowRight,
  Sparkles,
  Download,
  Trash2,
  Sun,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { THEMES } from "@/lib/themes";
import type { WhiteTheme } from "@/lib/types";
import { applyTheme } from "@/lib/themes";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Search;
  group: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  onSearch: (q: string) => void;
  onGoHome: () => void;
}

export function CommandPalette({ onSearch, onGoHome }: CommandPaletteProps) {
  const open = useWhite((s) => s.showCommand);
  const setOpen = useWhite((s) => s.setShowCommand);
  const setShowBookmarks = useWhite((s) => s.setShowBookmarks);
  const setShowMarkov = useWhite((s) => s.setShowMarkov);
  const setShowDomainRules = useWhite((s) => s.setShowDomainRules);
  const setShowStats = useWhite((s) => s.setShowStats);
  const setShowSettings = useWhite((s) => s.setShowSettings);
  const setShowAbout = useWhite((s) => s.setShowAbout);
  const setShowShortcuts = useWhite((s) => s.setShowShortcuts);
  const setPrefs = useWhite((s) => s.setPrefs);
  const prefs = useWhite((s) => s.prefs);
  const history = useWhite((s) => s.history);
  const { toast } = useWhite.getState();

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // build command list
  const commands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: "go-home",
        label: "Go home",
        hint: "Back to the clean start",
        icon: Home,
        group: "Navigation",
        action: () => {
          setOpen(false);
          onGoHome();
        },
        keywords: ["home", "back", "start"],
      },
      {
        id: "open-bookmarks",
        label: "Open Bookmarks",
        icon: Bookmark,
        group: "Navigation",
        action: () => {
          setOpen(false);
          setShowBookmarks(true);
        },
        keywords: ["bookmark", "save", "saved"],
      },
      {
        id: "open-markov",
        label: "Open Markov Inspector",
        hint: "See the trained chain",
        icon: Network,
        group: "Navigation",
        action: () => {
          setOpen(false);
          setShowMarkov(true);
        },
        keywords: ["markov", "chain", "inspector", "graph"],
      },
      {
        id: "open-domains",
        label: "Open Domain ranking",
        hint: "Raise / lower / block",
        icon: Sliders,
        group: "Navigation",
        action: () => {
          setOpen(false);
          setShowDomainRules(true);
        },
        keywords: ["domain", "ranking", "raise", "lower", "block"],
      },
      {
        id: "open-stats",
        label: "Open Search stats",
        icon: BarChart3,
        group: "Navigation",
        action: () => {
          setOpen(false);
          setShowStats(true);
        },
        keywords: ["stats", "analytics", "activity"],
      },
      {
        id: "open-shortcuts",
        label: "Show keyboard shortcuts",
        icon: Keyboard,
        group: "Navigation",
        action: () => {
          setOpen(false);
          setShowShortcuts(true);
        },
        keywords: ["shortcut", "help", "keyboard"],
      },
      {
        id: "open-settings",
        label: "Open Customize",
        icon: Settings,
        group: "Navigation",
        action: () => {
          setOpen(false);
          setShowSettings(true);
        },
        keywords: ["settings", "customize", "theme", "preferences"],
      },
      {
        id: "open-about",
        label: "About WHITE Search",
        icon: Info,
        group: "Navigation",
        action: () => {
          setOpen(false);
          setShowAbout(true);
        },
        keywords: ["about", "white", "philosophy"],
      },
      {
        id: "export-data",
        label: "Export my data",
        hint: "Download preferences + history",
        icon: Download,
        group: "Data",
        action: () => {
          setOpen(false);
          window.open("/api/export", "_blank");
        },
        keywords: ["export", "download", "backup"],
      },
    ];

    // theme switching commands
    for (const t of THEMES) {
      items.push({
        id: `theme-${t.id}`,
        label: `Theme: ${t.name}`,
        hint: t.description,
        icon: Sun,
        group: "Themes",
        action: () => {
          const next = { ...prefs, theme: t.id as WhiteTheme };
          setPrefs({ theme: t.id as WhiteTheme });
          applyTheme(next.theme, next.accent, next.density, next.fontScale, next.customAccent);
          fetch("/api/preferences", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(next),
          }).catch(() => {});
          setOpen(false);
        },
        keywords: ["theme", "color", "white", t.id, t.name.toLowerCase()],
      });
    }

    // recent searches
    for (const h of history.slice(0, 5)) {
      items.push({
        id: `search-${h.id}`,
        label: h.query,
        hint: `Search again · ${h.category}`,
        icon: Clock,
        group: "Recent searches",
        action: () => {
          setOpen(false);
          onSearch(h.query);
        },
        keywords: [h.query.toLowerCase()],
      });
    }

    return items;
  }, [history, prefs, onGoHome, onSearch, setOpen, setShowAbout, setShowBookmarks, setShowDomainRules, setShowMarkov, setShowSettings, setShowShortcuts, setShowStats, setPrefs]);

  // filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      const haystack = [c.label, c.group, ...(c.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [commands, query]);

  // reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);

  // keep active in range
  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  // scroll active into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.action();
    }
  };

  // group filtered items
  const groups = useMemo(() => {
    const g: Record<string, CommandItem[]> = {};
    for (const c of filtered) {
      (g[c.group] ??= []).push(c);
    }
    return g;
  }, [filtered]);

  let runningIdx = 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="ws-surface ws-hairline rounded-2xl p-0 sm:max-w-[520px] gap-0"
        onKeyDown={onKey}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        {/* search input */}
        <div className="flex items-center gap-3 px-5 py-4 ws-hairline-b">
          <Search className="size-4 shrink-0 text-foreground/40" strokeWidth={1.75} />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-foreground/35"
          />
          <kbd className="text-[10px] text-foreground/35">Esc</kbd>
        </div>

        {/* results */}
        <div ref={listRef} className="ws-scroll max-h-[400px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Search className="size-6 mb-2 text-foreground/25" strokeWidth={1.5} />
              <p className="text-[13px] text-foreground/45">No commands match &ldquo;{query}&rdquo;</p>
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group} className="mb-1">
              <h3 className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/35">
                {group}
              </h3>
              {items.map((c) => {
                const idx = runningIdx++;
                const Icon = c.icon;
                const isActive = idx === active;
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-idx={idx}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => c.action()}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={isActive ? { background: "var(--ws-whisper)" } : undefined}
                  >
                    <Icon
                      className="size-4 shrink-0"
                      style={{ color: isActive ? "var(--ws-accent)" : "var(--foreground)" , opacity: isActive ? 1 : 0.45 }}
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{c.label}</p>
                      {c.hint && (
                        <p className="truncate text-[11.5px] text-foreground/45">{c.hint}</p>
                      )}
                    </div>
                    {isActive && (
                      <ArrowRight className="size-3.5 shrink-0" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* footer */}
        <div className="ws-hairline-t flex items-center justify-between px-4 py-2.5 text-[11px] text-foreground/40">
          <span className="flex items-center gap-2">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-2">
            <kbd>↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3" style={{ color: "var(--ws-accent)" }} />
            WHITE command palette
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
