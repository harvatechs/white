"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWhite } from "@/lib/store";
import { History, Search, Trash2, X, Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";
import type { HistoryItem } from "@/lib/types";

interface HistoryTimelineProps {
  onPick: (q: string) => void;
}

interface ExtendedHistoryItem extends HistoryItem {
  clicked?: boolean;
}

export function HistoryTimeline({ onPick }: HistoryTimelineProps) {
  const open = useWhite((s) => s.showHistory);
  const setOpen = useWhite((s) => s.setShowHistory);
  const [items, setItems] = useState<ExtendedHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/history?limit=100", { cache: "no-store" });
      const d = (await r.json()) as { history: ExtendedHistoryItem[] };
      setItems(d.history ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        load();
      }, 0);
    }
  }, [open, load]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return items;
    const f = filter.toLowerCase();
    return items.filter((i) => i.query.toLowerCase().includes(f));
  }, [items, filter]);

  // Group by day
  const grouped = useMemo(() => {
    const groups: { label: string; items: ExtendedHistoryItem[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const item of filtered) {
      const d = new Date(item.createdAt);
      d.setHours(0, 0, 0, 0);
      let label: string;
      if (d.getTime() === today.getTime()) label = "Today";
      else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
      else label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [filtered]);

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/history?id=${id}`, { method: "DELETE" }).catch(() => {});
  };

  const clearAll = async () => {
    setItems([]);
    await fetch("/api/history", { method: "DELETE" }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-hidden ws-surface ws-hairline rounded-2xl p-0 sm:max-w-[560px] flex flex-col">
        <DialogHeader className="px-7 pt-7 pb-3 ws-hairline-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <History className="size-5" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
              Search history
            </DialogTitle>
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium text-foreground/45 hover:text-foreground/70 transition-colors"
              >
                <Trash2 className="size-3" strokeWidth={1.75} />
                Clear all
              </button>
            )}
          </div>
          <DialogDescription className="text-[13px] text-foreground/55">
            Your full search timeline. Private to your session — delete anytime.
          </DialogDescription>
        </DialogHeader>

        {/* Filter */}
        <div className="px-7 py-3 ws-hairline-b shrink-0">
          <div className="flex items-center gap-2 rounded-xl ws-hairline px-3 py-2">
            <Search className="size-4 text-foreground/35" strokeWidth={1.75} />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter history…"
              className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-foreground/30"
            />
            {filter && (
              <button
                type="button"
                onClick={() => setFilter("")}
                className="rounded-full p-0.5 text-foreground/30 hover:text-foreground/60 transition-colors"
              >
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="ws-scroll flex-1 overflow-y-auto px-7 py-4">
          {loading && (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="ws-skeleton h-12 rounded-xl" />
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <History className="size-7 mb-3 text-foreground/25" strokeWidth={1.5} />
              <p className="text-[14px] font-medium">
                {filter ? "No matches" : "No history yet"}
              </p>
              <p className="mt-1 text-[12.5px] text-foreground/50">
                {filter ? `No searches contain "${filter}"` : "Your searches will appear here, grouped by day."}
              </p>
            </div>
          )}

          {!loading && grouped.map((group) => (
            <div key={group.label} className="mb-5">
              <div className="mb-2 flex items-center gap-2">
                <Calendar className="size-3 text-foreground/35" strokeWidth={1.75} />
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/40">
                  {group.label}
                </h3>
                <span className="text-[10px] text-foreground/30">
                  {group.items.length} search{group.items.length !== 1 ? "es" : ""}
                </span>
              </div>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:ws-whisper transition-colors"
                  >
                    <Clock className="size-3.5 shrink-0 text-foreground/30" strokeWidth={1.75} />
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onPick(item.query);
                      }}
                      className="flex-1 truncate text-left text-[14px]"
                    >
                      {item.query}
                    </button>
                    <span className="shrink-0 text-[11px] tabular-nums text-foreground/35">
                      {new Date(item.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {item.clicked && (
                      <span
                        className="ws-pill shrink-0"
                        style={{ opacity: 0.5, fontSize: "9px", padding: "2px 6px" }}
                      >
                        visited
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      className="shrink-0 rounded-full p-1 text-foreground/20 opacity-0 hover:bg-foreground/5 hover:text-foreground/60 group-hover:opacity-100 transition-all"
                      aria-label="Delete"
                    >
                      <X className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </motion.li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
