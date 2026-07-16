"use client";

import { motion } from "framer-motion";
import { Hash, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HyperTag {
  text: string;
  isHost?: boolean;
}

interface HyperTagsProps {
  tags: string[];
  onTagClick?: (tag: string) => void;
}

// HyperTags — small clickable keyword chips below each search result.
// Users can go deeper and wider — falling into the rabbit hole.
export function HyperTags({ tags, onTagClick }: HyperTagsProps) {
  if (!tags || tags.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.1 }}
      className="mt-2.5 flex flex-wrap items-center gap-1.5"
    >
      <Hash className="size-2.5 text-foreground/25" strokeWidth={2} />
      {tags.map((tag, i) => (
        <button
          key={tag + i}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTagClick?.(tag);
          }}
          className={cn(
            "group inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[11px] font-medium transition-all active:scale-95",
            "text-foreground/45 hover:text-foreground/80"
          )}
          style={{
            background: "color-mix(in srgb, var(--ws-accent) 3%, transparent)",
          }}
          title={`Search deeper: ${tag}`}
        >
          <span className="max-w-[120px] truncate">{tag}</span>
          <ArrowUpRight
            className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100"
            strokeWidth={2}
          />
        </button>
      ))}
    </motion.div>
  );
}

// Extract HyperTags from a result's title + snippet
export function extractTags(title: string, snippet: string, host: string): string[] {
  const text = `${title} ${snippet}`.toLowerCase();
  const words = text.match(/\b[a-z]{4,}\b/g) ?? [];
  const stopWords = new Set([
    "the", "this", "that", "with", "from", "have", "they", "will", "what",
    "when", "where", "which", "their", "about", "would", "could", "should",
    "there", "these", "those", "being", "under", "after", "before", "between",
    "through", "during", "above", "below", "into", "your", "also", "more",
    "very", "just", "like", "only", "over", "than", "them", "then", "were",
    "been", "some", "such", "each", "other", "every", "most", "both",
    "http", "https", "www", "html", "page", "site", "link", "click",
  ]);

  const freq = new Map<string, number>();
  for (const w of words) {
    if (stopWords.has(w) || w.length < 4) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  const topKeywords = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([word]) => word);

  // Add host as a tag
  const hostTag = host.replace(/^www\./, "").split(".")[0];
  if (hostTag.length >= 3) topKeywords.push(hostTag);

  // Deduplicate and limit to 5
  return Array.from(new Set(topKeywords)).slice(0, 5);
}
