"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WhiteLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showDot?: boolean;
  className?: string;
  onClick?: () => void;
}

const SIZE_MAP = {
  sm: { text: "text-xl", mark: 8 },
  md: { text: "text-3xl", mark: 11 },
  lg: { text: "text-5xl md:text-6xl", mark: 16 },
  xl: { text: "text-7xl md:text-8xl", mark: 22 },
};

export function WhiteLogo({ size = "md", showDot = true, className, onClick }: WhiteLogoProps) {
  const s = SIZE_MAP[size];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-baseline gap-0 select-none",
        onClick && "cursor-pointer",
        className
      )}
      aria-label="WHITE Search"
    >
      <span
        className={cn(
          "font-semibold tracking-[-0.04em] leading-none",
          s.text
        )}
        style={{ fontFamily: "var(--font-geist-sans)" }}
      >
        WHITE
      </span>
      {showDot && (
        <motion.span
          className="ws-pulse ml-1 rounded-full"
          style={{
            width: s.mark,
            height: s.mark,
            background: "var(--ws-accent)",
            display: "inline-block",
            transformOrigin: "center",
          }}
          aria-hidden
        />
      )}
    </button>
  );
}
