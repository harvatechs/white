"use client";

import { useState } from "react";
import { Share2, Check, Link as LinkIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export function ShareButton({ query, category }: { query: string; category: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const share = async () => {
    const url = `${window.location.origin}/?q=${encodeURIComponent(query)}&c=${category}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `WHITE Search: ${query}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied", description: "Share this clean search with anyone." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // user cancelled share or clipboard failed — fallback
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast({ title: "Link copied", description: "Share this clean search with anyone." });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({ title: "Couldn't copy", description: "Copy the URL from your browser's address bar." });
      }
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground/45 hover:ws-whisper hover:text-foreground/80 transition-colors"
      aria-label="Share search"
      title="Share this search"
    >
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="size-4" style={{ color: "var(--ws-accent)" }} strokeWidth={2} />
          </motion.span>
        ) : (
          <motion.span
            key="share"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Share2 className="size-4" strokeWidth={1.75} />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
