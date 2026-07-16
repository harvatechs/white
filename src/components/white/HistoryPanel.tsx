"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, X, TrendingUp, ArrowUpRight } from "lucide-react";
import { useWhite } from "@/lib/store";
import type { HistoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  onPick: (q: string) => void;
  className?: string;
  compact?: boolean;
  centered?: boolean;
}

export function HistoryPanel({ onPick, className, compact, centered }: HistoryPanelProps) {
  const history = useWhite((s) => s.history);

  if (history.length === 0) return null;

  const items = compact ? history.slice(0, 6) : history.slice(0, 12);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("mb-3 flex items-center gap-2", centered && "justify-center")}>
        <Clock className="size-3.5 text-foreground/40" strokeWidth={1.75} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/40">
          Recent searches
        </h3>
      </div>
      <div className={cn("flex flex-wrap gap-2", centered && "justify-center")}>
        <AnimatePresence>
          {items.map((h) => (
            <motion.button
              key={h.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              type="button"
              onClick={() => onPick(h.query)}
              className="group inline-flex items-center gap-2 rounded-full ws-hairline px-3.5 py-1.5 text-[13px] hover:ws-whisper transition-colors"
            >
              <span className="max-w-[200px] truncate">{h.query}</span>
              {h.clicked && (
                <TrendingUp className="size-3 text-foreground/30" strokeWidth={1.75} />
              )}
              <ArrowUpRight
                className="size-3 text-foreground/30 opacity-0 transition-opacity group-hover:opacity-100"
                strokeWidth={1.75}
              />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function HistoryRow({
  item,
  onPick,
  onDelete,
}: {
  item: HistoryItem;
  onPick: (q: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:ws-whisper transition-colors">
      <Clock className="size-3.5 shrink-0 text-foreground/35" strokeWidth={1.75} />
      <button
        type="button"
        onClick={() => onPick(item.query)}
        className="flex-1 truncate text-left text-[14px]"
      >
        {item.query}
      </button>
      <span className="shrink-0 text-[11px] text-foreground/35">
        {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
      </span>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="shrink-0 rounded-full p-1 text-foreground/25 opacity-0 hover:bg-foreground/5 hover:text-foreground/60 group-hover:opacity-100 transition-all"
        aria-label="Delete"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
