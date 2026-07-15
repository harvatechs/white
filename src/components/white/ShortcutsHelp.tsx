"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWhite } from "@/lib/store";

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["/"], label: "Focus the search field" },
  { keys: ["Esc"], label: "Go home / close overlay" },
  { keys: ["?"], label: "Show this help" },
  { keys: ["g", "h"], label: "Go home" },
  { keys: ["g", "s"], label: "Open Customize" },
  { keys: ["g", "a"], label: "Open About" },
  { keys: ["g", "b"], label: "Open Bookmarks" },
  { keys: ["g", "m"], label: "Open Markov Inspector" },
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
        <div className="px-7 pb-7">
          <ul className="flex flex-col gap-1">
            {SHORTCUTS.map((s) => (
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
          <p className="mt-5 text-center text-[11px] text-foreground/40">
            Shortcuts are disabled while typing in a field.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
