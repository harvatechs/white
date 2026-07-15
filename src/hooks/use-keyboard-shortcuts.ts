"use client";

import { useEffect } from "react";
import { useWhite } from "@/lib/store";

interface ShortcutHandlers {
  onHome: () => void;
  onFocusSearch: () => void;
}

// Global keyboard shortcuts for WHITE Search.
//   /            focus the search field
//   Esc          go home (from results) or close overlays
//   g then h     go home
//   g then s     open settings
//   g then a     open about
//   g then b     open bookmarks
//   g then m     open markov inspector
//   ?            show shortcuts help
//   j / k        (reserved — handled in results list)
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const setShowSettings = useWhite((s) => s.setShowSettings);
  const setShowAbout = useWhite((s) => s.setShowAbout);
  const setShowShortcuts = useWhite((s) => s.setShowShortcuts);
  const setShowMarkov = useWhite((s) => s.setShowMarkov);
  const setShowBookmarks = useWhite((s) => s.setShowBookmarks);
  const view = useWhite((s) => s.view);

  useEffect(() => {
    let gPressed = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const resetG = () => {
      gPressed = false;
      if (gTimer) clearTimeout(gTimer);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === "input" ||
        tag === "textarea" ||
        target?.isContentEditable ||
        tag === "select";

      // Escape always works, even while typing
      if (e.key === "Escape") {
        const anyOpen =
          useWhite.getState().showSettings ||
          useWhite.getState().showAbout ||
          useWhite.getState().showShortcuts ||
          useWhite.getState().showMarkov ||
          useWhite.getState().showBookmarks;

        if (anyOpen) return; // let the dialog/sheet handle it
        if (view === "results") {
          e.preventDefault();
          handlers.onHome();
        }
        return;
      }

      if (isTyping) return;

      // "g" prefix (double-key shortcuts, vim-style)
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!gPressed) {
          gPressed = true;
          gTimer = setTimeout(resetG, 700);
          e.preventDefault();
          return;
        } else {
          // double g pressed without a second key — ignore
          resetG();
          e.preventDefault();
          return;
        }
      }

      if (gPressed) {
        const key = e.key.toLowerCase();
        if (key === "h") {
          e.preventDefault();
          handlers.onHome();
        } else if (key === "s") {
          e.preventDefault();
          setShowSettings(true);
        } else if (key === "a") {
          e.preventDefault();
          setShowAbout(true);
        } else if (key === "b") {
          e.preventDefault();
          setShowBookmarks(true);
        } else if (key === "m") {
          e.preventDefault();
          setShowMarkov(true);
        }
        resetG();
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        handlers.onFocusSearch();
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [view, handlers, setShowSettings, setShowAbout, setShowShortcuts, setShowMarkov, setShowBookmarks]);
}
