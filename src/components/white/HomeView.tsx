"use client";

import { motion } from "framer-motion";
import { SearchBox, type SearchBoxHandle } from "./SearchBox";
import { WhiteLogo } from "./WhiteLogo";
import { Footer } from "./Footer";
import { HistoryPanel } from "./HistoryPanel";
import { PopularSearches } from "./PopularSearches";
import { useWhite } from "@/lib/store";
import { useRef } from "react";

export function HomeView({ onSubmit }: { onSubmit: (q: string) => void }) {
  const history = useWhite((s) => s.history);
  const popularQueries = useWhite((s) => s.popularQueries);
  const searchRef = useRef<SearchBoxHandle>(null);

  const hasExtras = history.length > 0 || popularQueries.length > 0;

  return (
    <div className="ws-app">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl"
        >
          {/* Centered logo */}
          <div className="mb-7 flex flex-col items-center text-center sm:mb-9">
            <WhiteLogo size="xl" />
          </div>

          {/* Luxurious search bar */}
          <SearchBox
            ref={searchRef}
            size="lg"
            autoFocus
            onSubmit={onSubmit}
            className="w-full"
          />

          {/* Recent + popular — only if they exist */}
          {hasExtras && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-8 flex flex-col gap-6"
            >
              {history.length > 0 && (
                <HistoryPanel onPick={onSubmit} centered />
              )}
              {popularQueries.length > 0 && (
                <PopularSearches onPick={onSubmit} centered />
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
