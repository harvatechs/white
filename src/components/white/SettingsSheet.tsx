"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useWhite } from "@/lib/store";
import { ACCENTS, THEMES } from "@/lib/themes";
import { applyTheme } from "@/lib/themes";
import type { AccentName, Density, FontScale, WhiteTheme } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Trash2, RotateCcw } from "lucide-react";

export function SettingsSheet() {
  const open = useWhite((s) => s.showSettings);
  const setOpen = useWhite((s) => s.setShowSettings);
  const prefs = useWhite((s) => s.prefs);
  const setPrefs = useWhite((s) => s.setPrefs);
  const setHistory = useWhite((s) => s.setHistory);
  const { toast } = useToast();

  const save = (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(patch);
    applyTheme(next.theme, next.accent);
    fetch("/api/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  };

  const clearHistory = async () => {
    await fetch("/api/history", { method: "DELETE" }).catch(() => {});
    setHistory([]);
    toast({ title: "History cleared", description: "Your search history is gone." });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto ws-scroll sm:max-w-[440px] ws-surface ws-hairline-l p-0"
        style={{ borderLeft: "1px solid color-mix(in srgb, var(--ws-accent) 8%, transparent)" }}
      >
        <SheetHeader className="px-6 pt-6 pb-2 ws-hairline-b">
          <SheetTitle className="text-xl font-semibold tracking-tight">Customize</SheetTitle>
          <SheetDescription className="text-[13px] text-foreground/55">
            Make WHITE yours. Changes save instantly to your anonymous session.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-10">
          {/* THEME */}
          <section className="pt-6">
            <SectionLabel>White variations</SectionLabel>
            <p className="mb-3 mt-1 text-[12px] text-foreground/50">
              Eight shades of white. Pick the light that suits your eyes.
            </p>
            <div className="grid grid-cols-4 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="flex flex-col items-center gap-1.5"
                  onClick={() => save({ theme: t.id as WhiteTheme })}
                >
                  <span
                    className="ws-swatch"
                    data-active={prefs.theme === t.id}
                    style={{ background: t.swatch }}
                    title={t.description}
                  />
                  <span className="text-[11px] font-medium text-foreground/70">{t.name}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 min-h-[32px] text-[12px] italic leading-snug text-foreground/45">
              {THEMES.find((t) => t.id === prefs.theme)?.description}
            </p>
          </section>

          {/* ACCENT */}
          <section className="pt-5">
            <SectionLabel>Accent</SectionLabel>
            <div className="mt-3 flex items-center gap-3">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="flex flex-col items-center gap-1.5"
                  onClick={() => save({ accent: a.id as AccentName })}
                >
                  <span
                    className="size-9 rounded-full transition-all"
                    data-active={prefs.accent === a.id}
                    style={{
                      background: a.color,
                      outline: prefs.accent === a.id ? "2px solid var(--ws-bg)" : "none",
                      boxShadow:
                        prefs.accent === a.id
                          ? `0 0 0 2px ${a.color}`
                          : "0 0 0 1px color-mix(in srgb, var(--ws-accent) 10%, transparent)",
                    }}
                  />
                  <span className="text-[11px] font-medium text-foreground/70">{a.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* DENSITY */}
          <section className="pt-5">
            <SectionLabel>Density</SectionLabel>
            <div className="mt-3">
              <SegmentedControl
                value={prefs.density}
                options={[
                  { id: "compact", label: "Compact" },
                  { id: "comfortable", label: "Comfortable" },
                  { id: "airy", label: "Airy" },
                ]}
                onChange={(v) => save({ density: v as Density })}
              />
            </div>
          </section>

          {/* FONT SCALE */}
          <section className="pt-5">
            <SectionLabel>Type size</SectionLabel>
            <div className="mt-3">
              <SegmentedControl
                value={prefs.fontScale}
                options={[
                  { id: "small", label: "Small" },
                  { id: "base", label: "Base" },
                  { id: "large", label: "Large" },
                ]}
                onChange={(v) => save({ fontScale: v as FontScale })}
              />
            </div>
          </section>

          {/* SUGGESTION COUNT */}
          <section className="pt-5">
            <SectionLabel>
              Suggestions · <span style={{ color: "var(--ws-accent)" }}>{prefs.suggestionCount}</span>
            </SectionLabel>
            <p className="mt-1 text-[12px] text-foreground/50">
              How many Markov suggestions to surface as you type.
            </p>
            <div className="mt-3 px-1">
              <Slider
                value={[prefs.suggestionCount]}
                min={3}
                max={15}
                step={1}
                onValueChange={(v) => save({ suggestionCount: v[0] })}
                aria-label="Suggestion count"
              />
            </div>
          </section>

          {/* TOGGLES */}
          <section className="pt-5">
            <SectionLabel>Behavior</SectionLabel>
            <div className="mt-1">
              <ToggleRow
                label="Markov suggestions"
                hint="Predict your next word using a transparent Markov chain."
                checked={prefs.markovEnabled}
                onChange={(v) => save({ markovEnabled: v })}
              />
              <ToggleRow
                label="Safe search"
                hint="Filter explicit content from results when possible."
                checked={prefs.safeSearch}
                onChange={(v) => save({ safeSearch: v })}
              />
              <ToggleRow
                label="Open results in new tab"
                hint="Keeps WHITE open while you explore."
                checked={prefs.openNewTab}
                onChange={(v) => save({ openNewTab: v })}
              />
              <ToggleRow
                label="Show favicons"
                hint="Tiny site icons beside each result."
                checked={prefs.showFavicons}
                onChange={(v) => save({ showFavicons: v })}
              />
            </div>
          </section>

          {/* DATA */}
          <section className="pt-5">
            <SectionLabel>Your data</SectionLabel>
            <p className="mt-1 text-[12px] text-foreground/50">
              Your history and clicks live only in your anonymous session. Delete anytime.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={clearHistory}
                className="flex items-center justify-center gap-2 rounded-xl ws-hairline px-4 py-2.5 text-[13px] font-medium hover:ws-whisper transition-colors"
              >
                <Trash2 className="size-4" /> Clear search history
              </button>
              <button
                type="button"
                onClick={() =>
                  save({
                    theme: "pure",
                    density: "comfortable",
                    fontScale: "base",
                    safeSearch: true,
                    openNewTab: true,
                    showFavicons: true,
                    markovEnabled: true,
                    suggestionCount: 8,
                    accent: "graphite",
                  })
                }
                className="flex items-center justify-center gap-2 rounded-xl ws-hairline px-4 py-2.5 text-[13px] font-medium hover:ws-whisper transition-colors"
              >
                <RotateCcw className="size-4" /> Reset to defaults
              </button>
            </div>
          </section>

          <p className="mt-8 text-center text-[11px] text-foreground/35">
            WHITE Search · 100% open source · no tracking
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
      {children}
    </h3>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="ws-row">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{label}</p>
        <p className="text-[12px] text-foreground/50">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="ws-segmented">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          data-active={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
