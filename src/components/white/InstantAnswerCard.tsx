"use client";

import { motion } from "framer-motion";
import { Calculator, Ruler, Clock, BookOpen } from "lucide-react";

export interface InstantAnswerData {
  kind: "math" | "unit" | "time" | "definition" | "calc";
  title: string;
  value: string;
  detail?: string;
}

const KIND_ICON = {
  math: Calculator,
  calc: Calculator,
  unit: Ruler,
  time: Clock,
  definition: BookOpen,
};

const KIND_LABEL = {
  math: "Instant calculation",
  calc: "Instant calculation",
  unit: "Unit conversion",
  time: "Current time",
  definition: "Definition",
};

export function InstantAnswerCard({ answer }: { answer: InstantAnswerData }) {
  const Icon = KIND_ICON[answer.kind] ?? Calculator;
  const label = KIND_LABEL[answer.kind] ?? "Instant answer";

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl ws-hairline ws-surface"
    >
      <div className="flex items-start gap-4 p-5">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--ws-accent-soft)" }}
        >
          <Icon className="size-5" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: "var(--ws-accent)" }}
            >
              {label}
            </span>
            <span className="ws-pill" style={{ opacity: 0.5 }}>
              no ads
            </span>
          </div>
          <p className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
            {answer.value}
          </p>
          {answer.detail && (
            <p className="mt-1 text-[13px] text-foreground/55">{answer.detail}</p>
          )}
          {answer.kind === "definition" && (
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/80">{answer.value}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
