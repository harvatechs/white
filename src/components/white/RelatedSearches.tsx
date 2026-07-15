"use client";

import { motion } from "framer-motion";
import { Search, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RelatedSearchesProps {
  items: { text: string; source: string }[];
  onPick: (q: string) => void;
}

export function RelatedSearches({ items, onPick }: RelatedSearchesProps) {
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-6"
    >
      <div className="mb-3 flex items-center gap-2">
        <Search className="size-3.5 text-foreground/40" strokeWidth={1.75} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/40">
          People also search
        </h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <motion.button
            key={item.text + i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            type="button"
            onClick={() => onPick(item.text)}
            className="group inline-flex items-center gap-1.5 rounded-full ws-hairline px-3.5 py-1.5 text-[13px] hover:ws-whisper transition-colors"
          >
            <span className="max-w-[240px] truncate">{item.text}</span>
            <ArrowUpRight
              className="size-3 text-foreground/30 opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={1.75}
            />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
