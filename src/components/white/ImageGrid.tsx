"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, AlertCircle, X, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { useWhite } from "@/lib/store";
import type { SearchResultItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";

interface ImageItem {
  url: string;
  alt: string;
  source: string;
  sourceUrl: string;
  title: string;
  height?: number; // natural height for masonry
}

interface ImageGridProps {
  items: SearchResultItem[];
  loading: boolean;
  query: string;
}

// Google Images-style masonry grid with varied heights + lightbox viewer.
export function ImageGrid({ items, loading, query }: ImageGridProps) {
  const prefs = useWhite((s) => s.prefs);
  const [realImages, setRealImages] = useState<ImageItem[]>([]);
  const [imgLoading, setImgLoading] = useState(true);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Fetch real image URLs from /api/images
  useEffect(() => {
    if (!query.trim()) return;
    let active = true;
    setImgLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/images?q=${encodeURIComponent(query)}`);
        const d = (await r.json()) as { images: ImageItem[] };
        if (active) {
          // Assign pseudo-random heights for masonry variety (based on index)
          const withHeights = d.images.map((img, i) => ({
            ...img,
            height: [180, 240, 200, 280, 160, 220, 260, 190][i % 8],
          }));
          setRealImages(withHeights);
        }
      } catch {
        if (active) setRealImages([]);
      } finally {
        if (active) setImgLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [query]);

  // keyboard nav for lightbox
  const closeLightbox = useCallback(() => setLightbox(null), []);
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") setLightbox((i) => (i !== null ? Math.min(i + 1, realImages.length - 1) : i));
      else if (e.key === "ArrowLeft") setLightbox((i) => (i !== null ? Math.max(i - 1, 0) : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, realImages.length, closeLightbox]);

  const isLoading = loading || imgLoading;
  const useFallback = !isLoading && realImages.length === 0;

  if (isLoading) {
    return (
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 md:columns-4 lg:columns-5">
        {Array.from({ length: 14 }).map((_, i) => (
          <div
            key={i}
            className="ws-skeleton mb-3 break-inside-avoid rounded-xl"
            style={{ height: [180, 240, 200, 280, 160, 220, 260, 190][i % 8] }}
          />
        ))}
      </div>
    );
  }

  if (useFallback) {
    // Fallback to the old behavior: show search result cards as image tiles
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
    return (
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 md:columns-4 lg:columns-5">
        {items.map((item, i) => (
          <FallbackTile key={item.id} item={item} index={i} openNewTab={prefs.openNewTab} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-3 sm:columns-3 sm:gap-4 md:columns-4 lg:columns-5">
        {realImages.map((img, i) => (
          <ImageTile key={img.url + i} image={img} index={i} onOpen={() => setLightbox(i)} />
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && realImages[lightbox] && (
          <Lightbox
            image={realImages[lightbox]}
            index={lightbox}
            total={realImages.length}
            onClose={closeLightbox}
            onPrev={() => setLightbox((i) => (i !== null ? Math.max(i - 1, 0) : i))}
            onNext={() => setLightbox((i) => (i !== null ? Math.min(i + 1, realImages.length - 1) : i))}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ImageTile({ image, index, onOpen }: { image: ImageItem; index: number; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="group relative mb-3 block break-inside-avoid overflow-hidden rounded-xl ws-hairline ws-surface cursor-pointer transition-all hover:shadow-lg active:scale-[0.98]"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      onClick={onOpen}
    >
      <div
        className="relative w-full overflow-hidden bg-[color-mix(in_srgb,var(--ws-accent)_4%,transparent)]"
        style={{ height: image.height ?? 200 }}
      >
        {!loaded && !error && (
          <div className="ws-skeleton absolute inset-0" />
        )}
        {error ? (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: "var(--ws-accent-soft)" }}
          >
            <span className="text-2xl font-semibold" style={{ color: "var(--ws-accent)" }}>
              {(image.alt || image.source || "?").charAt(0).toUpperCase()}
            </span>
          </div>
        ) : (
          <img
            src={image.url}
            alt={image.alt || image.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={cn(
              "size-full object-cover transition-all duration-500 group-hover:scale-105",
              !loaded && "opacity-0"
            )}
          />
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <div className="p-3 text-white">
            <p className="line-clamp-2 text-[12px] font-medium leading-tight">
              {image.alt || image.title}
            </p>
            <p className="mt-0.5 truncate text-[10px] opacity-80">{image.source}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FallbackTile({ item, index, openNewTab }: { item: SearchResultItem; index: number; openNewTab: boolean }) {
  const isDirectImage = /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(item.url);
  const thumbUrl = isDirectImage
    ? item.url
    : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.cleanHost)}&sz=256`;

  return (
    <motion.a
      href={item.url}
      target={openNewTab ? "_blank" : "_self"}
      rel={openNewTab ? "noopener noreferrer" : undefined}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
      className="group relative mb-3 block break-inside-avoid overflow-hidden rounded-xl ws-hairline ws-surface transition-all hover:shadow-lg"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-[color-mix(in_srgb,var(--ws-accent)_4%,transparent)]">
        <img
          src={thumbUrl}
          alt={item.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-2">
        <p className="truncate text-[11px] font-medium leading-tight text-foreground/70">{item.name}</p>
        <p className="truncate text-[10px] text-foreground/40">{item.cleanHost}</p>
      </div>
    </motion.a>
  );
}

function Lightbox({
  image,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: {
  image: ImageItem;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[61] flex items-center justify-center p-4 sm:p-8"
        onClick={onClose}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="size-5" strokeWidth={2} />
        </button>

        {/* Prev */}
        {index > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="size-5" strokeWidth={2} />
          </button>
        )}

        {/* Next */}
        {index < total - 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="size-5" strokeWidth={2} />
          </button>
        )}

        {/* Image */}
        <div className="relative max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
          <img
            src={image.url}
            alt={image.alt || image.title}
            className="max-h-[75vh] max-w-full rounded-xl object-contain"
          />
          {/* Caption */}
          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-white">
                {image.alt || image.title}
              </p>
              <p className="flex items-center gap-1.5 truncate text-[12px] text-white/60">
                <Globe className="size-3" strokeWidth={1.75} />
                {image.source}
              </p>
            </div>
            <a
              href={image.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/80 hover:bg-white/20 transition-colors"
            >
              <ExternalLink className="size-3.5" strokeWidth={1.75} />
              Visit
            </a>
          </div>
          <p className="mt-1 text-[11px] text-white/40">
            {index + 1} / {total}
          </p>
        </div>
      </motion.div>
    </>
  );
}
