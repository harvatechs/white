"use client";

import { motion } from "framer-motion";
import { SearchBox, type SearchBoxHandle } from "./SearchBox";
import { WhiteLogo } from "./WhiteLogo";
import { HomeTagline, Footer } from "./Footer";
import { HistoryPanel } from "./HistoryPanel";
import { useWhite } from "@/lib/store";
import { useRef } from "react";

export function HomeView({ onSubmit }: { onSubmit: (q: string) => void }) {
  const history = useWhite((s) => s.history);
  const searchRef = useRef<SearchBoxHandle>(null);

  return (
    <div className="ws-app">
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl"
        >
          <div className="mb-9 flex flex-col items-center text-center">
            <WhiteLogo size="xl" />
            <p className="mt-4 text-[13px] uppercase tracking-[0.32em] text-foreground/40">
              Clean Search
            </p>
          </div>

          <SearchBox
            ref={searchRef}
            size="lg"
            autoFocus
            onSubmit={onSubmit}
            className="w-full"
          />

          <HomeTagline />

          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.4 }}
              className="mt-10"
            >
              <HistoryPanel onPick={onSubmit} />
            </motion.div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
