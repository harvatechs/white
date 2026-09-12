"use client";

import { useState, useRef } from "react";
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
import { ACCENTS, THEMES, applyTheme } from "@/lib/themes";
import type { AccentName, Density, FontScale, SearchAlgorithm, WhiteTheme } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2,
  RotateCcw,
  Download,
  Upload,
  Copy,
  Check,
  Zap,
  Shield,
  Plus,
  ArrowRight,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function SettingsSheet() {
  const open = useWhite((s) => s.showSettings);
  const setOpen = useWhite((s) => s.setShowSettings);
  const prefs = useWhite((s) => s.prefs);
  const setPrefs = useWhite((s) => s.setPrefs);
  const setHistory = useWhite((s) => s.setHistory);
  const setBookmarks = useWhite((s) => s.setBookmarks);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync token state
  const [syncToken, setSyncToken] = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);
  const [importTokenInput, setImportTokenInput] = useState("");

  // Custom bang state
  const [newBangPrefix, setNewBangPrefix] = useState("");
  const [newBangName, setNewBangName] = useState("");
  const [newBangUrl, setNewBangUrl] = useState("");

  // Custom spam domain state
  const [newSpamDomain, setNewSpamDomain] = useState("");

  // History timeframe
  const [historyTimeframe, setHistoryTimeframe] = useState<"hour" | "day" | "week" | "all">("hour");

  const save = (patch: Partial<typeof prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(patch);
    applyTheme(next.theme, next.accent, next.density, next.fontScale, next.customAccent);
    fetch("/api/preferences", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  };

  const generateSyncToken = async () => {
    try {
      const res = await fetch("/api/sync");
      const data = await res.json();
      if (data.token) {
        setSyncToken(data.token);
        navigator.clipboard.writeText(data.token);
        setTokenCopied(true);
        setTimeout(() => setTokenCopied(false), 3000);
        toast({
          title: "Sync Token Generated & Copied",
          description: "Paste this token on your other device to restore your entire session.",
        });
      }
    } catch {
      toast({ title: "Failed to generate sync token", variant: "destructive" });
    }
  };

  const importFromSyncToken = async () => {
    const token = importTokenInput.trim();
    if (!token) return;

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Session Synced!", description: "Preferences and bookmarks restored successfully." });
        setImportTokenInput("");
        // Refresh preferences
        const p = await fetch("/api/preferences").then((r) => r.json());
        if (p.prefs) {
          setPrefs(p.prefs);
          applyTheme(p.prefs.theme, p.prefs.accent, p.prefs.density, p.prefs.fontScale, p.prefs.customAccent);
        }
      } else {
        toast({ title: "Import Failed", description: data.error || "Invalid token", variant: "destructive" });
      }
    } catch {
      toast({ title: "Import Failed", description: "Invalid sync token format.", variant: "destructive" });
    }
  };

  const clearHistoryGranular = async () => {
    await fetch(`/api/history?timeframe=${historyTimeframe}`, { method: "DELETE" }).catch(() => {});
    const updated = await fetch("/api/history?limit=50").then((r) => r.json()).catch(() => ({ history: [] }));
    setHistory(updated.history ?? []);
    toast({
      title: "History purged",
      description: `Removed history items for: ${historyTimeframe}.`,
    });
  };

  const addCustomBang = () => {
    const p = newBangPrefix.trim().replace(/^!/, "");
    const n = newBangName.trim();
    const u = newBangUrl.trim();
    if (!p || !n || !u) return;

    const currentBangs = (prefs.customBangs as any) || [];
    const updated = [...currentBangs.filter((b: any) => b.prefix !== p), { prefix: p, name: n, urlTemplate: u }];
    save({ customBangs: updated });
    setNewBangPrefix("");
    setNewBangName("");
    setNewBangUrl("");
    toast({ title: "Custom Bang Added", description: `Use !${p} in search box.` });
  };

  const removeCustomBang = (prefix: string) => {
    const currentBangs = (prefs.customBangs as any) || [];
    save({ customBangs: currentBangs.filter((b: any) => b.prefix !== prefix) });
  };

  const addSpamDomain = () => {
    const d = newSpamDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d) return;
    const current = (prefs.customSpamDomains as string[]) || [];
    if (!current.includes(d)) {
      save({ customSpamDomains: [...current, d] });
    }
    setNewSpamDomain("");
    toast({ title: "Domain Blocked", description: `${d} will be hidden from search results.` });
  };

  const removeSpamDomain = (domain: string) => {
    const current = (prefs.customSpamDomains as string[]) || [];
    save({ customSpamDomains: current.filter((d) => d !== domain) });
  };

  const exportData = async () => {
    try {
      const r = await fetch("/api/export");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `white-search-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported", description: "Your preferences, history, and bookmarks downloaded." });
    } catch {
      toast({ title: "Export failed", description: "Please try again.", variant: "destructive" });
    }
  };

  const triggerImport = () => fileInputRef.current?.click();

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const r = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = (await r.json()) as { ok: boolean; imported?: { preferences: boolean; history: number; bookmarks: number } };
      if (result.ok && result.imported) {
        toast({
          title: "Data imported",
          description: `Preferences${result.imported.preferences ? " ✓" : ""} · ${result.imported.history} history · ${result.imported.bookmarks} bookmarks`,
        });
        const [p, h, b] = await Promise.all([
          fetch("/api/preferences").then((r) => r.json()),
          fetch("/api/history?limit=20").then((r) => r.json()),
          fetch("/api/bookmarks").then((r) => r.json()),
        ]);
        if (p.prefs) {
          setPrefs(p.prefs);
          applyTheme(p.prefs.theme, p.prefs.accent, p.prefs.density, p.prefs.fontScale, p.prefs.customAccent);
        }
        if (h.history) setHistory(h.history);
        if (b.bookmarks) setBookmarks(b.bookmarks);
      }
    } catch {
      toast({ title: "Import failed", description: "Invalid file format.", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const customBangsList = (prefs.customBangs as any) || [];
  const customSpamList = (prefs.customSpamDomains as string[]) || [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto ws-scroll sm:max-w-[480px] ws-surface ws-hairline-l p-0"
        style={{ borderLeft: "1px solid color-mix(in srgb, var(--ws-accent) 8%, transparent)" }}
      >
        <SheetHeader className="px-6 pt-6 pb-2 ws-hairline-b">
          <SheetTitle className="text-xl font-semibold tracking-tight">Customize WHITE</SheetTitle>
          <SheetDescription className="text-[13px] text-foreground/55">
            Zero tracking. Maximum customization. Pure search engine control.
          </SheetDescription>
        </SheetHeader>

        <div className="px-6 pb-12">
          {/* THEME */}
          <section className="pt-6">
            <SectionLabel>White variations</SectionLabel>
            <p className="mb-3 mt-1 text-[12px] text-foreground/50">
              Eight shades of pure minimalist white.
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
                  onClick={() => save({ accent: a.id as AccentName, customAccent: null })}
                >
                  <span
                    className="size-9 rounded-full transition-all"
                    data-active={prefs.accent === a.id && !prefs.customAccent}
                    style={{
                      background: a.color,
                      outline: prefs.accent === a.id && !prefs.customAccent ? "2px solid var(--ws-bg)" : "none",
                      boxShadow:
                        prefs.accent === a.id && !prefs.customAccent
                          ? `0 0 0 2px ${a.color}`
                          : "0 0 0 1px color-mix(in srgb, var(--ws-accent) 10%, transparent)",
                    }}
                  />
                  <span className="text-[11px] font-medium text-foreground/70">{a.name}</span>
                </button>
              ))}
              <label className="flex cursor-pointer flex-col items-center gap-1.5" title="Custom accent color">
                <span
                  className="relative size-9 overflow-hidden rounded-full transition-all"
                  data-active={!!prefs.customAccent}
                  style={{
                    background: prefs.customAccent ?? "conic-gradient(from 0deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #b39ddb, #ff6b6b)",
                    outline: prefs.customAccent ? "2px solid var(--ws-bg)" : "none",
                    boxShadow: prefs.customAccent
                      ? `0 0 0 2px ${prefs.customAccent}`
                      : "0 0 0 1px color-mix(in srgb, var(--ws-accent) 10%, transparent)",
                  }}
                >
                  <input
                    type="color"
                    value={prefs.customAccent ?? "#1a1a1a"}
                    onChange={(e) => save({ customAccent: e.target.value })}
                    className="absolute inset-0 size-full cursor-pointer opacity-0"
                    aria-label="Pick custom accent color"
                  />
                </span>
                <span className="text-[11px] font-medium text-foreground/70">Custom</span>
              </label>
            </div>
          </section>

          {/* SEARCH PROVIDER */}
          <section className="pt-5">
            <SectionLabel>Search Engine Provider</SectionLabel>
            <p className="mt-1 text-[12px] text-foreground/50">
              Select your primary search aggregator with automatic cascading failover.
            </p>
            <div className="mt-3">
              <SegmentedControl
                value={prefs.searchProvider}
                options={[
                  { id: "ddg", label: "DuckDuckGo" },
                  { id: "searxng", label: "SearXNG" },
                  { id: "local", label: "Local BM25" },
                ]}
                onChange={(v) => save({ searchProvider: v as any })}
              />
            </div>
            {prefs.searchProvider === "searxng" && (
              <div className="mt-3">
                <label className="text-[11.5px] font-medium text-foreground/60">Preferred SearXNG Instance</label>
                <input
                  type="url"
                  value={prefs.searxngInstance}
                  onChange={(e) => save({ searxngInstance: e.target.value })}
                  placeholder="https://searx.be"
                  className="mt-1 w-full rounded-xl border border-foreground/10 bg-transparent px-3 py-1.5 text-[13px] outline-none focus:border-[color-mix(in_srgb,var(--ws-accent)_40%,transparent)] transition-colors"
                />
              </div>
            )}
          </section>

          {/* SEARCH ALGORITHM & TUNING */}
          <section className="pt-5">
            <SectionLabel>Search Ranking & Weights</SectionLabel>
            <div className="mt-3 flex flex-col gap-1.5">
              {([
                { id: "relevance", label: "Natural Relevance", desc: "Unfiltered organic ranking" },
                { id: "recency", label: "Recent First", desc: "Prioritize newest publications" },
                { id: "diverse", label: "Source Diversity", desc: "Limits domains to maximum 2 items" },
                { id: "markov", label: "Markov-Boosted", desc: "Prioritizes your frequently clicked hosts" },
              ] as { id: SearchAlgorithm; label: string; desc: string }[]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => save({ searchAlgorithm: opt.id })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all",
                    prefs.searchAlgorithm === opt.id
                      ? "border-[color-mix(in_srgb,var(--ws-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--ws-accent)_4%,transparent)]"
                      : "border-foreground/8 hover:bg-[color-mix(in_srgb,var(--ws-accent)_2%,transparent)]"
                  )}
                >
                  <div
                    className="flex size-4 shrink-0 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: prefs.searchAlgorithm === opt.id ? "var(--ws-accent)" : "color-mix(in srgb, var(--foreground) 20%, transparent)",
                    }}
                  >
                    {prefs.searchAlgorithm === opt.id && (
                      <div className="size-2 rounded-full" style={{ background: "var(--ws-accent)" }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{opt.label}</p>
                    <p className="text-[11.5px] text-foreground/45">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-foreground/8 bg-foreground/3 p-4">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="font-medium text-foreground/75">Recency Bias</span>
                  <span className="text-[11px] font-mono text-foreground/45">{prefs.weightRecency}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={prefs.weightRecency ?? 0}
                  onChange={(e) => save({ weightRecency: parseInt(e.target.value, 10) })}
                  className="w-full accent-[var(--ws-accent)] h-1 bg-foreground/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="font-medium text-foreground/75">Diversity Weight</span>
                  <span className="text-[11px] font-mono text-foreground/45">{prefs.weightDiversity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={prefs.weightDiversity ?? 0}
                  onChange={(e) => save({ weightDiversity: parseInt(e.target.value, 10) })}
                  className="w-full accent-[var(--ws-accent)] h-1 bg-foreground/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </section>

          {/* CUSTOM BANGS MANAGER */}
          <section className="pt-5">
            <SectionLabel>Custom Bangs Shortcuts (!)</SectionLabel>
            <p className="mt-1 text-[12px] text-foreground/50">
              Create your own search shortcuts. Example: prefix <code className="font-mono">gl</code> for GitLab.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="!prefix (e.g. gl)"
                  value={newBangPrefix}
                  onChange={(e) => setNewBangPrefix(e.target.value)}
                  className="w-24 rounded-lg border border-foreground/10 bg-transparent px-2.5 py-1.5 text-[12.5px] outline-none"
                />
                <input
                  type="text"
                  placeholder="Service Name (e.g. GitLab)"
                  value={newBangName}
                  onChange={(e) => setNewBangName(e.target.value)}
                  className="flex-1 rounded-lg border border-foreground/10 bg-transparent px-2.5 py-1.5 text-[12.5px] outline-none"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="URL with {{{s}}} (e.g. https://gitlab.com/search?search={{{s}}})"
                  value={newBangUrl}
                  onChange={(e) => setNewBangUrl(e.target.value)}
                  className="flex-1 rounded-lg border border-foreground/10 bg-transparent px-2.5 py-1.5 text-[12.5px] outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomBang}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-white transition-opacity"
                  style={{ background: "var(--ws-accent)" }}
                >
                  <Plus className="size-4" />
                </button>
              </div>

              {customBangsList.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {customBangsList.map((b: any) => (
                    <div key={b.prefix} className="flex items-center justify-between rounded-lg ws-hairline px-3 py-1.5 text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold" style={{ color: "var(--ws-accent)" }}>!{b.prefix}</span>
                        <span>{b.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCustomBang(b.prefix)}
                        className="text-foreground/40 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* SPAM DOMAIN FILTER */}
          <section className="pt-5">
            <SectionLabel>Custom Spam & Blocklist</SectionLabel>
            <p className="mt-1 text-[12px] text-foreground/50">
              Permanently hide content farms or unwanted domains from all results.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                placeholder="domain.com to block"
                value={newSpamDomain}
                onChange={(e) => setNewSpamDomain(e.target.value)}
                className="flex-1 rounded-lg border border-foreground/10 bg-transparent px-2.5 py-1.5 text-[12.5px] outline-none"
              />
              <button
                type="button"
                onClick={addSpamDomain}
                className="rounded-lg px-3 py-1.5 text-[12px] font-medium ws-hairline hover:ws-whisper"
              >
                Block
              </button>
            </div>
            {customSpamList.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customSpamList.map((domain) => (
                  <span key={domain} className="inline-flex items-center gap-1.5 rounded-md ws-hairline px-2 py-0.5 text-[11.5px]">
                    <span>{domain}</span>
                    <button type="button" onClick={() => removeSpamDomain(domain)} className="text-foreground/40 hover:text-destructive">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* SESSION SYNC & PASSKEY */}
          <section className="pt-5">
            <SectionLabel>Device Sync & Migration</SectionLabel>
            <p className="mt-1 text-[12px] text-foreground/50">
              Transfer bookmarks and settings to another device via password-less sync token.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                onClick={generateSyncToken}
                className="flex items-center justify-center gap-2 rounded-xl ws-hairline px-4 py-2.5 text-[13px] font-medium hover:ws-whisper transition-colors"
              >
                {tokenCopied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
                {tokenCopied ? "Token Copied to Clipboard!" : "Copy Sync Token for Another Device"}
              </button>

              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Paste sync token here to restore..."
                  value={importTokenInput}
                  onChange={(e) => setImportTokenInput(e.target.value)}
                  className="flex-1 rounded-lg border border-foreground/10 bg-transparent px-2.5 py-1.5 text-[12px] font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={importFromSyncToken}
                  className="rounded-lg px-3 py-1.5 text-[12px] font-medium ws-hairline hover:ws-whisper"
                >
                  Sync
                </button>
              </div>
            </div>
          </section>

          {/* GRANULAR HISTORY PURGING */}
          <section className="pt-5">
            <SectionLabel>History & Privacy Management</SectionLabel>
            <p className="mt-1 text-[12px] text-foreground/50">
              Clear search history selectively by timeframe.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={historyTimeframe}
                onChange={(e) => setHistoryTimeframe(e.target.value as any)}
                className="rounded-lg border border-foreground/10 bg-transparent px-2.5 py-1.5 text-[12.5px] outline-none"
              >
                <option value="hour">Last 1 Hour</option>
                <option value="day">Today (24 Hours)</option>
                <option value="week">Past 7 Days</option>
                <option value="all">All History</option>
              </select>
              <button
                type="button"
                onClick={clearHistoryGranular}
                className="flex items-center gap-1.5 rounded-lg ws-hairline px-3 py-1.5 text-[12.5px] font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="size-3.5" /> Purge History
              </button>
            </div>
          </section>

          {/* DATA BACKUP & RESET */}
          <section className="pt-5">
            <SectionLabel>Backup & Restore</SectionLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onImportFile}
              className="hidden"
              aria-hidden
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={exportData}
                className="flex items-center justify-center gap-1.5 rounded-xl ws-hairline px-3 py-2 text-[12.5px] font-medium hover:ws-whisper transition-colors"
              >
                <Download className="size-3.5" /> JSON Export
              </button>
              <button
                type="button"
                onClick={triggerImport}
                className="flex items-center justify-center gap-1.5 rounded-xl ws-hairline px-3 py-2 text-[12.5px] font-medium hover:ws-whisper transition-colors"
              >
                <Upload className="size-3.5" /> JSON Import
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
                    customAccent: null,
                    searchAlgorithm: "relevance",
                    searchProvider: "ddg",
                    searxngInstance: "https://searx.be",
                    localFirst: true,
                    weightRecency: 0,
                    weightDiversity: 0,
                    weightPersonal: 0,
                    spamFilter: true,
                    customBangs: [],
                    customSpamDomains: [],
                  })
                }
                className="flex items-center justify-center gap-1.5 rounded-xl ws-hairline px-3 py-2 text-[12.5px] font-medium hover:ws-whisper transition-colors"
              >
                <RotateCcw className="size-3.5" /> Reset All
              </button>
            </div>
          </section>

          <p className="mt-8 text-center text-[11px] text-foreground/35">
            WHITE Search Engine · Zero AI synthesis · 100% Privacy
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
