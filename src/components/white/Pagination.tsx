"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize, loading, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  if (total === 0) return null;

  // Show a compact page selector: 1 ... [current-1, current, current+1] ... last
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center gap-1 py-6"
    >
      {/* Prev */}
      <button
        type="button"
        onClick={() => hasPrev && onPageChange(page - 1)}
        disabled={!hasPrev || loading}
        className={cn(
          "flex size-9 items-center justify-center rounded-lg transition-colors",
          hasPrev && !loading
            ? "text-foreground/60 hover:ws-whisper hover:text-foreground"
            : "text-foreground/20 cursor-not-allowed"
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="size-4" strokeWidth={1.75} />
      </button>

      {/* Page numbers */}
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-[13px] text-foreground/30">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => p !== page && onPageChange(p)}
            disabled={loading}
            className={cn(
              "flex size-9 items-center justify-center rounded-lg text-[13px] font-medium tabular-nums transition-all",
              p === page
                ? "text-white"
                : "text-foreground/60 hover:ws-whisper hover:text-foreground",
              loading && p === page && "opacity-70"
            )}
            style={p === page ? { background: "var(--ws-accent)" } : undefined}
            aria-current={p === page ? "page" : undefined}
          >
            {loading && p === page ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />
            ) : (
              p
            )}
          </button>
        )
      )}

      {/* Next */}
      <button
        type="button"
        onClick={() => hasNext && onPageChange(page + 1)}
        disabled={!hasNext || loading}
        className={cn(
          "flex size-9 items-center justify-center rounded-lg transition-colors",
          hasNext && !loading
            ? "text-foreground/60 hover:ws-whisper hover:text-foreground"
            : "text-foreground/20 cursor-not-allowed"
        )}
        aria-label="Next page"
      >
        <ChevronRight className="size-4" strokeWidth={1.75} />
      </button>
    </motion.div>
  );
}
