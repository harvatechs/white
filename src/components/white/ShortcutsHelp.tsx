"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWhite } from "@/lib/store";

const SHORTCUTS: { keys: string[]; label: string; group: string }[] = [
  { keys: ["/"], label: "Focus the search field", group: "Search" },
  { keys: ["⌘K"], label: "Open command palette", group: "Search" },
  { keys: ["Esc"], label: "Go home / close overlay", group: "Search" },
  { keys: ["?"], label: "Show this help", group: "Search" },
  { keys: ["j"], label: "Next result", group: "Results" },
  { keys: ["k"], label: "Previous result", group: "Results" },
  { keys: ["Enter"], label: "Read focused result (preview)", group: "Results" },
  { keys: ["o"], label: "Open focused result in new tab", group: "Results" },
  { keys: ["n"], label: "Next page of results", group: "Results" },
  { keys: ["p"], label: "Previous page of results", group: "Results" },
  { keys: ["g", "h"], label: "Go home", group: "Navigation" },
  { keys: ["g", "s"], label: "Open Customize", group: "Navigation" },
  { keys: ["g", "a"], label: "Open About", group: "Navigation" },
  { keys: ["g", "b"], label: "Open Bookmarks", group: "Navigation" },
  { keys: ["g", "m"], label: "Open Markov Inspector", group: "Navigation" },
  { keys: ["g", "d"], label: "Open Domain ranking", group: "Navigation" },
  { keys: ["g", "t"], label: "Open Search stats", group: "Navigation" },
  { keys: ["g", "h"], label: "Open Search history", group: "Navigation" },
  { keys: ["g", "o"], label: "Go home", group: "Navigation" },
  { keys: ["s"], label: "Summarize current page (in Reading Mode)", group: "Results" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-flex min-w-[26px] items-center justify-center rounded-md ws-hairline px-2 py-1 text-[12px] font-medium tabular-nums"
      style={{ background: "var(--ws-surface)", fontFamily: "var(--font-geist-mono)" }}
    >
      {children}
    </kbd>
  );
}

export function ShortcutsHelp() {
  const open = useWhite((s) => s.showShortcuts);
  const setOpen = useWhite((s) => s.setShowShortcuts);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="ws-surface ws-hairline rounded-2xl p-0 sm:max-w-[440px]">
        <DialogHeader className="px-7 pt-7 pb-3">
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-[13px] text-foreground/55">
            Friction-less by design. Keep your hands on the keyboard.
          </DialogDescription>
        </DialogHeader>
        <div className="px-7 pb-7 ws-scroll max-h-[60vh] overflow-y-auto">
          {["Search", "Results", "Navigation"].map((group) => (
            <div key={group} className="mb-4 last:mb-0">
              <h3 className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/40">
                {group}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {SHORTCUTS.filter((s) => s.group === group).map((s) => (
                  <li
                    key={s.label}
                    className="flex items-center justify-between gap-4 rounded-lg px-2 py-2 hover:ws-whisper transition-colors"
                  >
                    <span className="text-[13.5px] text-foreground/75">{s.label}</span>
                    <span className="flex items-center gap-1">
                      {s.keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-[10px] text-foreground/30">then</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-3 text-center text-[11px] text-foreground/40">
            Shortcuts are disabled while typing in a field.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
