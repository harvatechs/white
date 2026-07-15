"use client";

import { motion } from "framer-motion";
import { ExternalLink, ImageIcon, AlertCircle } from "lucide-react";
import { useWhite } from "@/lib/store";
import type { SearchResultItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ImageGridProps {
  items: SearchResultItem[];
  loading: boolean;
  query: string;
}

// Google Images-style masonry grid. Uses CSS columns for natural masonry flow.
export function ImageGrid({ items, loading, query }: ImageGridProps) {
  const prefs = useWhite((s) => s.prefs);

  if (loading) {
    return (
      <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="ws-skeleton mb-3 break-inside-avoid rounded-xl"
            style={{ height: 120 + (i % 4) * 50 }}
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <div
          className="mb-5 flex size-14 items-center justify-center rounded-2xl"
          style={{ background: "var(--ws-accent-soft)" }}
        >
          <AlertCircle className="size-7" style={{ color: "var(--ws-accent)" }} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-medium tracking-tight">No images for &ldquo;{query}&rdquo;</h3>
        <p className="mt-2 max-w-sm text-sm text-foreground/55">
          Try a more specific query, or switch to the Web tab for text results.
        </p>
      </div>
    );
  }

  const target = prefs.openNewTab ? "_blank" : "_self";
  const rel = prefs.openNewTab ? "noopener noreferrer" : undefined;

  return (
    <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 md:columns-4 lg:columns-5">
      {items.map((item, i) => (
        <ImageTile key={item.id} item={item} index={i} target={target} rel={rel} />
      ))}
    </div>
  );
}

function ImageTile({
  item,
  index,
  target,
  rel,
}: {
  item: SearchResultItem;
  index: number;
  target: string;
  rel?: string;
}) {
  // Generate a thumbnail proxy URL — use Google's favicon-style image service as a clean fallback,
  // otherwise try to use the result URL directly if it's an image
  const isDirectImage = /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(item.url);
  const thumbUrl = isDirectImage
    ? item.url
    : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.cleanHost)}&sz=256`;

  return (
    <motion.a
      href={item.url}
      target={target}
      rel={rel}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="group relative mb-3 block break-inside-avoid overflow-hidden rounded-xl ws-hairline ws-surface transition-all hover:shadow-lg"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-[color-mix(in_srgb,var(--ws-accent)_4%,transparent)]">
        <img
          src={thumbUrl}
          alt={item.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const img = e.currentTarget;
            // fallback to a colored block with letter
            img.style.display = "none";
            const parent = img.parentElement;
            if (parent && !parent.querySelector(".ws-img-fallback")) {
              const fallback = document.createElement("div");
              fallback.className = "ws-img-fallback flex h-full w-full items-center justify-center";
              fallback.style.background = "var(--ws-accent-soft)";
              fallback.innerHTML = `<span style="color:var(--ws-accent);font-size:28px;font-weight:600">${item.letterbox}</span>`;
              parent.appendChild(fallback);
            }
          }}
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="p-2.5 text-white">
            <p className="truncate text-[11px] font-medium leading-tight">{item.name}</p>
            <p className="truncate text-[10px] opacity-80">{item.cleanHost}</p>
          </div>
          <ExternalLink className="absolute right-2 top-2 size-3.5 text-white/70" strokeWidth={2} />
        </div>
      </div>
      {/* Caption (always visible) */}
      <div className="p-2">
        <p className="truncate text-[11px] font-medium leading-tight text-foreground/70">{item.name}</p>
        <p className="truncate text-[10px] text-foreground/40">{item.cleanHost}</p>
      </div>
    </motion.a>
  );
}
