"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, Globe, Shield, Type } from "lucide-react";
import { useWhite } from "@/lib/store";
import { cn } from "@/lib/utils";

const REGIONS = [
  { id: "all", label: "All regions" },
  { id: "us", label: "United States" },
  { id: "uk", label: "United Kingdom" },
  { id: "in", label: "India" },
  { id: "ca", label: "Canada" },
  { id: "au", label: "Australia" },
  { id: "de", label: "Germany" },
  { id: "fr", label: "France" },
  { id: "jp", label: "Japan" },
];

const LANGUAGES = [
  { id: "all", label: "All languages" },
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "ja", label: "Japanese" },
  { id: "zh", label: "Chinese" },
  { id: "hi", label: "Hindi" },
];

export function FiltersButton() {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState("all");
  const [language, setLanguage] = useState("all");
  const prefs = useWhite((s) => s.prefs);
  const setPrefs = useWhite((s) => s.setPrefs);
  const panelRef = useRef<HTMLDivElement>(null);

  const safeSearch = prefs.safeSearch;

  const toggleSafeSearch = () => {
    setPrefs({ safeSearch: !safeSearch });
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const activeCount = (region !== "all" ? 1 : 0) + (language !== "all" ? 1 : 0);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "relative flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
          open || activeCount > 0
            ? "text-foreground/80 ws-whisper"
            : "text-foreground/45 hover:ws-whisper hover:text-foreground/80"
        )}
        aria-label="Search filters"
        aria-expanded={open}
      >
        <SlidersHorizontal className="size-4" strokeWidth={1.75} />
        {activeCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular-nums"
            style={{ background: "var(--ws-accent)", color: "#fff" }}
          >
            {activeCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-2xl border border-foreground/8 backdrop-blur-xl"
            style={{
              background: "color-mix(in srgb, var(--ws-surface) 94%, transparent)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.04)",
            }}
            role="menu"
          >
            {/* Safe search toggle */}
            <div className="flex items-center justify-between border-b border-foreground/6 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Shield className="size-4 text-foreground/45" strokeWidth={1.75} />
                <div>
                  <p className="text-[13px] font-medium">Safe search</p>
                  <p className="text-[11px] text-foreground/45">Filter explicit content</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleSafeSearch}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  safeSearch ? "" : "bg-foreground/15"
                )}
                style={safeSearch ? { background: "var(--ws-accent)" } : undefined}
                aria-pressed={safeSearch}
                aria-label="Toggle safe search"
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
                    safeSearch ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            {/* Region */}
            <div className="border-b border-foreground/6 px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <Globe className="size-3.5 text-foreground/45" strokeWidth={1.75} />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/40">Region</h4>
              </div>
              <div className="flex flex-wrap gap-1">
                {REGIONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRegion(r.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                      region === r.id
                        ? "text-white"
                        : "text-foreground/55 hover:ws-whisper hover:text-foreground"
                    )}
                    style={region === r.id ? { background: "var(--ws-accent)" } : undefined}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <Type className="size-3.5 text-foreground/45" strokeWidth={1.75} />
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/40">Language</h4>
              </div>
              <div className="flex flex-wrap gap-1">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLanguage(l.id)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                      language === l.id
                        ? "text-white"
                        : "text-foreground/55 hover:ws-whisper hover:text-foreground"
                    )}
                    style={language === l.id ? { background: "var(--ws-accent)" } : undefined}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-foreground/6 px-4 py-2.5">
              {activeCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setRegion("all");
                    setLanguage("all");
                  }}
                  className="text-[11px] font-medium text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  Reset filters
                </button>
              ) : (
                <span className="text-[10px] text-foreground/30">No active filters</span>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-white"
                style={{ background: "var(--ws-accent)" }}
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
