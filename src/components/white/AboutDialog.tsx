"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWhite } from "@/lib/store";
import { WhiteLogo } from "./WhiteLogo";
import { ShieldCheck, EyeOff, Heart, GitBranch, Sparkles, Scale } from "lucide-react";

export function AboutDialog() {
  const open = useWhite((s) => s.showAbout);
  const setOpen = useWhite((s) => s.setShowAbout);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[88vh] overflow-y-auto ws-scroll sm:max-w-[560px] ws-surface ws-hairline rounded-2xl p-0">
        <DialogHeader className="px-7 pt-7 pb-2">
          <div className="flex items-center justify-between">
            <WhiteLogo size="sm" />
            <span className="ws-pill">v1.0 · open source</span>
          </div>
          <DialogTitle className="mt-5 text-2xl font-semibold tracking-tight">
            What &ldquo;WHITE&rdquo; means
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed text-foreground/60">
            WHITE means <span className="font-medium text-foreground">clean</span>. A clean page. A
            clean result. A clean internet. It is a statement about design and intent — not about
            people, color, or race.
          </DialogDescription>
        </DialogHeader>

        <div className="px-7 pb-7 pt-3">
          <section className="rounded-xl ws-whisper p-4">
            <p className="text-[13px] leading-relaxed text-foreground/70">
              We chose the word <strong>WHITE</strong> because a white page is the beginning of
              every idea. No noise. No clutter. No ads. No sponsors. Just you and the answer. It
              has <em>nothing</em> to do with racism, and we reject that reading entirely. The
              internet belongs to everyone — of every color, every language, every background.
            </p>
          </section>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Principle
              icon={ShieldCheck}
              title="No ads. Ever."
              body="Search results are ranked by relevance, not by who paid the most. There is no second price auction, no keyword bidding, no promoted slot."
            />
            <Principle
              icon={EyeOff}
              title="No tracking"
              body="No user profiles. No behavioral fingerprints. Your history stays on this device and in your own anonymous session — you can erase it in one click."
            />
            <Principle
              icon={Sparkles}
              title="Markov, not AI"
              body="Suggestions come from a transparent Markov chain that you help train by searching. You can read every transition in the open source code. Nothing is a black box."
            />
            <Principle
              icon={Heart}
              title="Of the people"
              body="100% open source. Built the way the internet was meant to be: of the people, by the people, for the people. Fork it, host it, improve it."
            />
            <Principle
              icon={GitBranch}
              title="Open source"
              body="The full engine — UI, ranking, Markov model, theme system — is auditable and hackable. Submit a pull request, run your own instance, teach the chain."
            />
            <Principle
              icon={Scale}
              title="Friction-less"
              body="Inspired by the design law of Steve Jobs: the best interface gets out of the way. One field. One answer. One tap. Nothing more than it needs to be."
            />
          </div>

          <section className="mt-6 rounded-xl ws-hairline p-4">
            <p className="text-[13px] leading-relaxed text-foreground/70">
              <span className="font-medium text-foreground">Our influences:</span> the advancement
              of Google, the simplicity of DuckDuckGo, and the inspiration of Kagi — refined down
              to a single, calm, white surface.
            </p>
          </section>

          <p className="mt-6 text-center text-[12px] text-foreground/40">
            Back to the common search.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Principle({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof ShieldCheck;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl ws-hairline p-4">
      <div
        className="mb-2 flex size-8 items-center justify-center rounded-lg"
        style={{ background: "var(--ws-accent-soft)" }}
      >
        <Icon className="size-4" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
      </div>
      <h4 className="text-[14px] font-semibold tracking-tight">{title}</h4>
      <p className="mt-1 text-[12.5px] leading-relaxed text-foreground/60">{body}</p>
    </div>
  );
}
