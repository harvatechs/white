"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWhite } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type { MarkovInspectorData } from "@/lib/types";
import { Network, Trash2, Search, ArrowRight, Hash, Sigma, GitBranch, Share2 } from "lucide-react";
import { MarkovGraph } from "./MarkovGraph";

export function MarkovInspector() {
  const open = useWhite((s) => s.showMarkov);
  const setOpen = useWhite((s) => s.setShowMarkov);
  const { toast } = useToast();
  const [data, setData] = useState<MarkovInspectorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");

  const load = useCallback(async (t?: string) => {
    setLoading(true);
    try {
      const url = t ? `/api/markov?token=${encodeURIComponent(t)}` : "/api/markov";
      const r = await fetch(url, { cache: "no-store" });
      const d = (await r.json()) as MarkovInspectorData;
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load(token);
  }, [open, token, load]);

  const reset = async () => {
    await fetch("/api/markov", { method: "DELETE" });
    toast({
      title: "Markov chain reset",
      description: "Every token and transition has been erased. The chain will re-learn as you search.",
    });
    setToken("");
    load("");
  };

  const stats = data?.stats;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto ws-scroll ws-surface ws-hairline rounded-2xl p-0 sm:max-w-[640px]">
        <DialogHeader className="px-7 pt-7 pb-3 ws-hairline-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Network className="size-5" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
              Markov Inspector
            </DialogTitle>
            <span className="ws-pill">transparency</span>
          </div>
          <DialogDescription className="text-[13px] text-foreground/55">
            Every suggestion WHITE makes comes from this transparent chain. Read it. Audit it. Reset it.
          </DialogDescription>
        </DialogHeader>

        <div className="px-7 py-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard icon={Hash} label="Tokens" value={stats?.nodes ?? 0} />
            <StatCard icon={GitBranch} label="Transitions" value={stats?.edges ?? 0} />
            <StatCard icon={Sigma} label="Total frequency" value={stats?.totalFrequency ?? 0} />
          </div>

          {/* Token inspector */}
          <div className="mt-6">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
              Inspect a token
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl ws-hairline px-3 py-2">
              <Search className="size-4 text-foreground/40" strokeWidth={1.75} />
              <input
                value={token}
                onChange={(e) => setToken(e.target.value.toLowerCase().trim())}
                placeholder="e.g. open"
                className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-foreground/30"
              />
            </div>
            {token && data && data.tokenTransitions.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-[12px] text-foreground/50">
                  What comes after <span className="font-medium" style={{ color: "var(--ws-accent)" }}>&ldquo;{token}&rdquo;</span>:
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.tokenTransitions.map((t) => (
                    <button
                      key={t.toToken}
                      type="button"
                      onClick={() => setToken(t.toToken)}
                      className="ws-pill hover:opacity-100 transition-opacity"
                      style={{ opacity: 0.85 }}
                    >
                      {t.toToken} <span className="opacity-60">· {t.weight}</span>
                      <ArrowRight className="size-3 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {token && data && data.tokenTransitions.length === 0 && !loading && (
              <p className="mt-3 text-[12px] text-foreground/40">
                No transitions recorded from &ldquo;{token}&rdquo; yet.
              </p>
            )}
          </div>

          {/* Top starts */}
          <Section title="Most common query starts">
            <TokenList
              items={data?.topStarts?.map((t) => ({ left: t.token, right: t.startCount })) ?? []}
              rightLabel="starts"
            />
          </Section>

          {/* Top tokens */}
          <Section title="Most frequent tokens">
            <TokenList
              items={data?.topTokens?.map((t) => ({ left: t.token, right: t.frequency })) ?? []}
              rightLabel="freq"
            />
          </Section>

          {/* Visual graph */}
          <Section title="Transition graph">
            <MarkovGraph edges={data?.topEdges ?? []} maxNodes={10} />
          </Section>

          {/* Top transitions */}
          <Section title="Strongest transitions">
            <div className="flex flex-col">
              {(data?.topEdges ?? []).map((e, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:ws-whisper transition-colors"
                >
                  <span className="font-mono text-[13px]" style={{ color: "var(--ws-accent)" }}>
                    {e.fromToken}
                  </span>
                  <ArrowRight className="size-3 text-foreground/30" strokeWidth={1.75} />
                  <span className="font-mono text-[13px]">{e.toToken}</span>
                  <span className="ml-auto text-[12px] tabular-nums text-foreground/40">
                    weight {e.weight}
                  </span>
                </div>
              ))}
              {(data?.topEdges ?? []).length === 0 && (
                <p className="px-2 py-3 text-[12px] text-foreground/40">No transitions yet.</p>
              )}
            </div>
          </Section>

          {/* Reset */}
          <div className="mt-6 flex items-center justify-between gap-4 rounded-xl ws-hairline p-4">
            <div>
              <p className="text-[13px] font-medium">Reset the chain</p>
              <p className="text-[12px] text-foreground/50">
                Erase every token and transition. WHITE will re-learn from your next searches.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-colors"
              style={{ background: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
            >
              <Trash2 className="size-3.5" /> Reset
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: number }) {
  return (
    <div className="rounded-xl ws-hairline p-4 text-center">
      <Icon className="mx-auto size-4 text-foreground/40" strokeWidth={1.75} />
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value.toLocaleString()}</p>
      <p className="text-[11px] uppercase tracking-[0.1em] text-foreground/45">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
        {title}
      </h3>
      {children}
    </section>
  );
}

function TokenList({
  items,
  rightLabel,
}: {
  items: { left: string; right: number }[];
  rightLabel: string;
}) {
  if (items.length === 0) return <p className="px-2 py-3 text-[12px] text-foreground/40">Nothing yet.</p>;
  const max = Math.max(...items.map((i) => i.right), 1);
  return (
    <div className="flex flex-col">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:ws-whisper transition-colors">
          <span className="font-mono text-[13px]" style={{ color: "var(--ws-accent)" }}>
            {it.left}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full ws-whisper">
            <div
              className="h-full rounded-full"
              style={{ width: `${(it.right / max) * 100}%`, background: "var(--ws-accent)", opacity: 0.5 }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-[12px] tabular-nums text-foreground/45">
            {it.right} {rightLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
