"use client";

import { useWhite } from "@/lib/store";
import { WhiteLogo } from "./WhiteLogo";
import { Settings, Menu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark,
  Network,
  Sliders,
  BarChart3,
  Info,
  Keyboard,
  Github,
  X,
  History,
} from "lucide-react";

export function Footer() {
  const setShowAbout = useWhite((s) => s.setShowAbout);
  const setShowSettings = useWhite((s) => s.setShowSettings);
  const setShowBookmarks = useWhite((s) => s.setShowBookmarks);
  const setShowMarkov = useWhite((s) => s.setShowMarkov);
  const setShowShortcuts = useWhite((s) => s.setShowShortcuts);
  const setShowDomainRules = useWhite((s) => s.setShowDomainRules);
  const setShowStats = useWhite((s) => s.setShowStats);
  const setShowCommand = useWhite((s) => s.setShowCommand);
  const setShowHistory = useWhite((s) => s.setShowHistory);
  const bookmarkCount = useWhite((s) => s.bookmarks.length);
  const domainRuleCount = useWhite((s) => s.domainRules.length);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const items = [
    { label: "Customize", icon: Settings, action: () => setShowSettings(true) },
    { label: "Bookmarks", icon: Bookmark, action: () => setShowBookmarks(true), badge: bookmarkCount },
    { label: "Search history", icon: History, action: () => setShowHistory(true) },
    { label: "Domain ranking", icon: Sliders, action: () => setShowDomainRules(true), badge: domainRuleCount },
    { label: "Search stats", icon: BarChart3, action: () => setShowStats(true) },
    { label: "Markov Inspector", icon: Network, action: () => setShowMarkov(true) },
    { label: "Keyboard shortcuts", icon: Keyboard, action: () => setShowShortcuts(true) },
    { label: "About WHITE", icon: Info, action: () => setShowAbout(true) },
    { label: "Open source", icon: Github, action: () => window.open("https://github.com", "_blank", "noopener") },
  ];

  return (
    <footer className="mt-auto">
      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-4 sm:py-5">
        {/* Brand — tiny */}
        <div className="flex items-center gap-2">
          <WhiteLogo size="sm" showDot={false} />
        </div>

        {/* Single settings button with expandable menu */}
        <div ref={menuRef} className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex size-9 items-center justify-center rounded-full text-foreground/45 hover:ws-whisper hover:text-foreground/80 transition-colors"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <Menu className="size-4" strokeWidth={1.75} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="absolute bottom-[calc(100%+8px)] right-0 z-50 w-60 overflow-hidden rounded-2xl border border-foreground/8 backdrop-blur-xl"
                style={{
                  background: "color-mix(in srgb, var(--ws-surface) 94%, transparent)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.04)",
                }}
                role="menu"
              >
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        item.action();
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] font-medium text-foreground/70 hover:bg-[color-mix(in_srgb,var(--ws-accent)_4%,transparent)] hover:text-foreground transition-colors"
                    >
                      <Icon className="size-4 shrink-0 text-foreground/45" strokeWidth={1.75} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span
                          className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
                          style={{ background: "var(--ws-accent-soft)", color: "var(--ws-accent)" }}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                <div className="border-t border-foreground/6 px-4 py-2 text-center text-[10px] text-foreground/30">
                  of the people · by the people · for the people
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </footer>
  );
}
