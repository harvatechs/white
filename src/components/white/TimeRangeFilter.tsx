"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimeRange = "all" | "day" | "week" | "month" | "year";

const RANGES: { id: TimeRange; label: string; days: number }[] = [
  { id: "all", label: "All time", days: 0 },
  { id: "day", label: "Past 24h", days: 1 },
  { id: "week", label: "Past week", days: 7 },
  { id: "month", label: "Past month", days: 30 },
  { id: "year", label: "Past year", days: 365 },
];

export const TIME_RANGE_DAYS: Record<TimeRange, number> = RANGES.reduce(
  (acc, r) => ((acc[r.id] = r.days), acc),
  {} as Record<TimeRange, number>
);

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (r: TimeRange) => void;
  className?: string;
}

export function TimeRangeFilter({ value, onChange, className }: TimeRangeFilterProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Clock className="size-3.5 shrink-0 text-foreground/35" strokeWidth={1.75} />
      <div className="ws-segmented" style={{ padding: 2 }}>
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            data-active={value === r.id}
            onClick={() => onChange(r.id)}
            className="text-[12px] whitespace-nowrap"
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
