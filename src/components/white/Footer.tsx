"use client";

import { useWhite } from "@/lib/store";
import { WhiteLogo } from "./WhiteLogo";
import { Info, Settings, Github, Sparkles } from "lucide-react";

export function Footer() {
  const setShowAbout = useWhite((s) => s.setShowAbout);
  const setShowSettings = useWhite((s) => s.setShowSettings);

  return (
    <footer className="mt-auto ws-hairline-t">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-5 py-6 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-3">
          <WhiteLogo size="sm" showDot={false} />
          <span className="text-[12px] text-foreground/45">
            · clean search · no ads · no sponsors
          </span>
        </div>

        <nav className="flex items-center gap-1">
          <FooterButton onClick={() => setShowAbout(true)} icon={Info} label="About" />
          <FooterButton onClick={() => setShowSettings(true)} icon={Settings} label="Customize" />
          <FooterButton
            onClick={() => window.open("https://github.com", "_blank", "noopener")}
            icon={Github}
            label="Open source"
          />
        </nav>

        <p className="ws-ticker text-[11px] text-foreground/40">
          of the people · by the people · for the people
        </p>
      </div>
    </footer>
  );
}

function FooterButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: typeof Info;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-foreground/60 hover:ws-whisper hover:text-foreground transition-colors"
    >
      <Icon className="size-3.5" strokeWidth={1.75} />
      {label}
    </button>
  );
}

export function HomeTagline() {
  return (
    <div className="mt-8 flex flex-col items-center gap-3 text-center">
      <p className="max-w-md text-[13px] leading-relaxed text-foreground/45">
        The world&rsquo;s cleanest search engine. No ads. No sponsors. No tracking. Just the open
        web — and a transparent Markov chain that learns from you.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="ws-pill">
          <Sparkles className="size-3" /> Markov-powered
        </span>
        <span className="ws-pill" style={{ opacity: 0.7 }}>
          100% open source
        </span>
        <span className="ws-pill" style={{ opacity: 0.7 }}>
          8 white themes
        </span>
      </div>
    </div>
  );
}
