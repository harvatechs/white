"use client";

import { Globe, Newspaper, Image as ImageIcon, Video } from "lucide-react";
import { useWhite } from "@/lib/store";
import type { SearchCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS: { id: SearchCategory; label: string; icon: typeof Globe }[] = [
  { id: "web", label: "Web", icon: Globe },
  { id: "news", label: "News", icon: Newspaper },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "videos", label: "Videos", icon: Video },
];

export function SearchTabs({
  onChange,
}: {
  onChange?: (c: SearchCategory) => void;
}) {
  const category = useWhite((s) => s.category);
  const setCategory = useWhite((s) => s.setCategory);

  return (
    <nav
      className="flex items-center gap-6 overflow-x-auto ws-scroll"
      aria-label="Search categories"
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = category === t.id;
        return (
          <button
            key={t.id}
            type="button"
            className="ws-tab flex items-center gap-1.5 whitespace-nowrap"
            data-active={isActive}
            onClick={() => {
              setCategory(t.id);
              onChange?.(t.id);
            }}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-3.5" strokeWidth={1.75} />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
