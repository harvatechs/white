"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWhite } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Sliders, ArrowUp, ArrowDown, Ban, X, Plus } from "lucide-react";
import type { DomainAction } from "@/lib/types";

const ACTION_META: Record<DomainAction, { label: string; icon: typeof ArrowUp; color: string }> = {
  raise: { label: "Raise", icon: ArrowUp, color: "var(--ws-accent)" },
  lower: { label: "Lower", icon: ArrowDown, color: "#8a8a8a" },
  block: { label: "Block", icon: Ban, color: "var(--destructive)" },
};

export function DomainRulesDialog() {
  const open = useWhite((s) => s.showDomainRules);
  const setOpen = useWhite((s) => s.setShowDomainRules);
  const rules = useWhite((s) => s.domainRules);
  const setDomainRules = useWhite((s) => s.setDomainRules);
  const removeDomainRule = useWhite((s) => s.removeDomainRule);
  const { toast } = useToast();
  const [host, setHost] = useState("");
  const [action, setAction] = useState<DomainAction>("raise");

  const addRule = async () => {
    const h = host.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    if (!h) return;
    useWhite.getState().setDomainRule(h, action);
    await fetch("/api/domains", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ host: h, action }),
    }).catch(() => {});
    setHost("");
    toast({ title: `${ACTION_META[action].label} set`, description: `Future results from ${h} will be ${action === "block" ? "hidden" : action === "raise" ? "boosted" : "demoted"}.` });
  };

  const remove = async (h: string) => {
    removeDomainRule(h);
    await fetch(`/api/domains?host=${encodeURIComponent(h)}`, { method: "DELETE" }).catch(() => {});
  };

  const clearAll = async () => {
    setDomainRules([]);
    await fetch("/api/domains", { method: "DELETE" }).catch(() => {});
    toast({ title: "All domain rules cleared" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto ws-scroll ws-surface ws-hairline rounded-2xl p-0 sm:max-w-[520px]">
        <DialogHeader className="px-7 pt-7 pb-3 ws-hairline-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Sliders className="size-5" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
              Domain ranking
            </DialogTitle>
            <span className="ws-pill">{rules.length} rule{rules.length !== 1 ? "s" : ""}</span>
          </div>
          <DialogDescription className="text-[13px] text-foreground/55">
            Shape your own results. Raise sites you trust, lower noise, block what you never want to see. Kagi-inspired — your rules, your ranking.
          </DialogDescription>
        </DialogHeader>

        <div className="px-7 py-5">
          {/* add form */}
          <div className="rounded-xl ws-hairline p-4">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
              Add a rule
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={host}
                onChange={(e) => setHost(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addRule()}
                placeholder="example.com"
                className="flex-1 rounded-lg ws-hairline bg-transparent px-3 py-2 text-[14px] outline-none focus:ws-ring transition-shadow"
              />
              <div className="flex gap-1">
                {(["raise", "lower", "block"] as DomainAction[]).map((a) => {
                  const meta = ACTION_META[a];
                  const Icon = meta.icon;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAction(a)}
                      data-active={action === a}
                      className="ws-segmented-btn inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all"
                      style={
                        action === a
                          ? { background: "var(--ws-surface)", color: meta.color, boxShadow: "0 0 0 1px color-mix(in srgb, var(--ws-accent) 12%, transparent)" }
                          : { color: "var(--foreground)" , opacity: 0.55 }
                      }
                    >
                      <Icon className="size-3.5" strokeWidth={2} />
                      <span className="hidden sm:inline">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={addRule}
              disabled={!host.trim()}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-40 transition-opacity"
              style={{ background: "var(--ws-accent)", color: "#fff" }}
            >
              <Plus className="size-4" strokeWidth={2} />
              Add rule
            </button>
          </div>

          {/* existing rules */}
          {rules.length > 0 ? (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground/45">
                  Active rules
                </h3>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-medium text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <ul className="flex flex-col gap-1">
                {rules.map((r) => {
                  const meta = ACTION_META[r.action];
                  const Icon = meta.icon;
                  return (
                    <li
                      key={r.id}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:ws-whisper transition-colors"
                    >
                      <Icon className="size-4 shrink-0" style={{ color: meta.color }} strokeWidth={2} />
                      <span className="flex-1 truncate font-mono text-[13px]">{r.host}</span>
                      <span className="text-[11px] uppercase tracking-wide text-foreground/40">{meta.label}</span>
                      <button
                        type="button"
                        onClick={() => remove(r.host)}
                        className="rounded-full p-1 text-foreground/25 opacity-0 hover:bg-foreground/5 hover:text-foreground/60 group-hover:opacity-100 transition-all"
                        aria-label={`Remove rule for ${r.host}`}
                      >
                        <X className="size-3.5" strokeWidth={1.75} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center justify-center py-8 text-center">
              <Sliders className="size-6 mb-2 text-foreground/25" strokeWidth={1.5} />
              <p className="text-[13px] font-medium">No rules yet</p>
              <p className="mt-1 max-w-[280px] text-[12px] text-foreground/45">
                Add a domain above to start shaping your results. Rules apply instantly to your next search.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
