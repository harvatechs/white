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
import {
  BarChart3,
  Search,
  MousePointerClick,
  Bookmark,
  TrendingUp,
  Globe,
  Clock,
  Hash,
} from "lucide-react";
import { motion } from "framer-motion";

interface StatsData {
  totalSearches: number;
  totalClicks: number;
  uniqueQueries: number;
  clickThroughRate: number;
  bookmarks: number;
  domainRules: number;
  categories: { name: string; count: number }[];
  days: { date: string; label: string; count: number }[];
  recentlyVisited: { host: string; title: string; url: string; query: string; visitedAt: string }[];
  topHosts: { host: string; count: number }[];
}

export function StatsDialog() {
  const open = useWhite((s) => s.showStats);
  const setOpen = useWhite((s) => s.setShowStats);
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/stats", { cache: "no-store" });
      const d = (await r.json()) as StatsData;
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        load();
      }, 0);
    }
  }, [open, load]);

  const maxDay = Math.max(...(data?.days.map((d) => d.count) ?? [0]), 1);
  const maxCat = Math.max(...(data?.categories.map((c) => c.count) ?? [0]), 1);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto ws-scroll ws-surface ws-hairline rounded-2xl p-0 sm:max-w-[580px]">
        <DialogHeader className="px-7 pt-7 pb-3 ws-hairline-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <BarChart3 className="size-5" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
              Your search stats
            </DialogTitle>
            <span className="ws-pill">private</span>
          </div>
          <DialogDescription className="text-[13px] text-foreground/55">
            A clean look at your search activity. All data stays in your anonymous session — never shared.
          </DialogDescription>
        </DialogHeader>

        <div className="px-7 py-5">
          {loading && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="ws-skeleton h-16 rounded-xl" />
              ))}
            </div>
          )}

          {!loading && data && (
            <>
              {/* top stats grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={Search} label="Searches" value={data.totalSearches} />
                <StatCard icon={Hash} label="Unique" value={data.uniqueQueries} />
                <StatCard icon={MousePointerClick} label="Clicks" value={data.totalClicks} />
                <StatCard icon={TrendingUp} label="CTR" value={`${data.clickThroughRate}%`} />
              </div>

              {/* 7-day activity chart */}
              <section className="mt-6">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
                  Last 7 days
                </h3>
                <div className="flex items-end justify-between gap-2 rounded-xl ws-hairline p-4" style={{ height: 120 }}>
                  {data.days.map((d, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.count / maxDay) * 70}px` }}
                        transition={{ duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full rounded-t-md"
                        style={{
                          background: d.count > 0 ? "var(--ws-accent)" : "color-mix(in srgb, var(--ws-accent) 10%, transparent)",
                          minHeight: d.count > 0 ? 4 : 2,
                          opacity: d.count > 0 ? 0.8 : 0.3,
                        }}
                        title={`${d.count} searches`}
                      />
                      <span className="text-[10px] font-medium text-foreground/40">{d.label}</span>
                      {d.count > 0 && (
                        <span className="text-[10px] font-semibold tabular-nums" style={{ color: "var(--ws-accent)" }}>
                          {d.count}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* categories */}
              {data.categories.length > 0 && (
                <section className="mt-6">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
                    By category
                  </h3>
                  <div className="flex flex-col gap-2">
                    {data.categories.map((c) => (
                      <div key={c.name} className="flex items-center gap-3">
                        <span className="w-16 text-[13px] font-medium capitalize text-foreground/70">{c.name}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full ws-whisper">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(c.count / maxCat) * 100}%` }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full"
                            style={{ background: "var(--ws-accent)", opacity: 0.6 }}
                          />
                        </div>
                        <span className="w-8 text-right text-[12px] tabular-nums text-foreground/45">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* recently visited */}
              {data.recentlyVisited.length > 0 && (
                <section className="mt-6">
                  <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
                    <Clock className="size-3" strokeWidth={1.75} />
                    Recently visited
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {data.recentlyVisited.slice(0, 6).map((v, i) => (
                      <li key={i}>
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:ws-whisper transition-colors"
                        >
                          <Globe className="size-3.5 shrink-0 text-foreground/35" strokeWidth={1.75} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium">{v.title || v.host}</p>
                            <p className="truncate text-[11px] text-foreground/40">
                              {v.host} · searched &ldquo;{v.query}&rdquo;
                            </p>
                          </div>
                          <span className="shrink-0 text-[10px] text-foreground/35">
                            {new Date(v.visitedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* extras */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl ws-hairline p-3 text-center">
                  <Bookmark className="mx-auto size-4 text-foreground/40" strokeWidth={1.75} />
                  <p className="mt-1.5 text-lg font-semibold tabular-nums">{data.bookmarks}</p>
                  <p className="text-[10px] uppercase tracking-wide text-foreground/40">Bookmarks</p>
                </div>
                <div className="rounded-xl ws-hairline p-3 text-center">
                  <BarChart3 className="mx-auto size-4 text-foreground/40" strokeWidth={1.75} />
                  <p className="mt-1.5 text-lg font-semibold tabular-nums">{data.domainRules}</p>
                  <p className="text-[10px] uppercase tracking-wide text-foreground/40">Domain rules</p>
                </div>
              </div>
            </>
          )}

          {!loading && !data && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="size-7 mb-3 text-foreground/25" strokeWidth={1.5} />
              <p className="text-[14px] font-medium">No stats yet</p>
              <p className="mt-1 text-[12.5px] text-foreground/50">
                Start searching to see your activity here.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Search; label: string; value: string | number }) {
  return (
    <div className="rounded-xl ws-hairline p-3 text-center">
      <Icon className="mx-auto size-4 text-foreground/40" strokeWidth={1.75} />
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-foreground/40">{label}</p>
    </div>
  );
}
