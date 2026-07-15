"use client";

import { motion } from "framer-motion";
import { TrendingUp, Globe } from "lucide-react";
import { useWhite } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PopularSearchesProps {
  onPick: (q: string) => void;
  centered?: boolean;
  className?: string;
}

export function PopularSearches({ onPick, centered, className }: PopularSearchesProps) {
  const queries = useWhite((s) => s.popularQueries);
  const hosts = useWhite((s) => s.popularHosts);

  if (queries.length === 0 && hosts.length === 0) return null;

  const maxQ = Math.max(...queries.map((q) => q.count), 1);

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("mb-3 flex items-center gap-2", centered && "justify-center")}>
        <TrendingUp className="size-3.5 text-foreground/40" strokeWidth={1.75} />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/40">
          Popular right now
        </h3>
        <span className="ws-pill" style={{ opacity: 0.6 }}>
          of the people
        </span>
      </div>

      {queries.length > 0 && (
        <div className={cn("flex flex-wrap gap-2", centered && "justify-center")}>
          {queries.map((q, i) => (
            <motion.button
              key={q.query + i}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.02 }}
              type="button"
              onClick={() => onPick(q.query)}
              className="group inline-flex items-center gap-2 rounded-full ws-hairline px-3.5 py-1.5 text-[13px] hover:ws-whisper transition-colors"
              title={`Searched ${q.count} time${q.count > 1 ? "s" : ""}`}
            >
              <span className="max-w-[220px] truncate">{q.query}</span>
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full"
                style={{
                  background: "var(--ws-accent)",
                  opacity: 0.3 + (q.count / maxQ) * 0.7,
                }}
              />
            </motion.button>
          ))}
        </div>
      )}

      {hosts.length > 0 && (
        <div className={cn("mt-5", centered && "text-center")}>
          <div className={cn("mb-2 flex items-center gap-2", centered && "justify-center")}>
            <Globe className="size-3 text-foreground/35" strokeWidth={1.75} />
            <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/35">
              Most-visited sources
            </h4>
          </div>
          <div className={cn("flex flex-wrap gap-x-4 gap-y-1", centered && "justify-center")}>
            {hosts.slice(0, 6).map((h, i) => (
              <span key={h.host + i} className="text-[12px] text-foreground/45">
                {h.host}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
