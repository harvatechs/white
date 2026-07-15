"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Sparkles } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ws_pwa_dismissed";

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // don't show if already dismissed or already installed (standalone)
    const dismissed = localStorage.getItem(DISMISS_KEY);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (dismissed || isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // small delay so it doesn't feel intrusive on first load
      setTimeout(() => setVisible(true), 4000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2"
        >
          <div
            className="ws-surface ws-hairline flex items-center gap-3 rounded-2xl p-3 shadow-2xl"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
          >
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "var(--ws-accent-soft)" }}
            >
              <Download className="size-5" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight">Install WHITE Search</p>
              <p className="text-[11.5px] text-foreground/50">Add to your home screen for a cleaner, faster experience.</p>
            </div>
            <button
              type="button"
              onClick={handleInstall}
              className="shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
              style={{ background: "var(--ws-accent)", color: "#fff" }}
            >
              Install
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded-full p-1 text-foreground/30 hover:bg-foreground/5 hover:text-foreground/60 transition-colors"
              aria-label="Dismiss"
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
