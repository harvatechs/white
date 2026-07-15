"use client";

import { useWhite } from "@/lib/store";
import { WhiteLogo } from "./WhiteLogo";
import {
  Info,
  Settings,
  Github,
  Sparkles,
  Bookmark,
  Network,
  Keyboard,
} from "lucide-react";

export function Footer() {
  const setShowAbout = useWhite((s) => s.setShowAbout);
  const setShowSettings = useWhite((s) => s.setShowSettings);
  const setShowBookmarks = useWhite((s) => s.setShowBookmarks);
  const setShowMarkov = useWhite((s) => s.setShowMarkov);
  const setShowShortcuts = useWhite((s) => s.setShowShortcuts);
  const bookmarkCount = useWhite((s) => s.bookmarks.length);

  return (
    <footer className="mt-auto ws-hairline-t">
      <div className="mx-auto max-w-5xl px-5 py-5">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <WhiteLogo size="sm" showDot={false} />
            <span className="hidden text-[12px] text-foreground/40 sm:inline">
              · clean search · no ads
            </span>
          </div>

          {/* Primary nav */}
          <nav className="flex flex-wrap items-center justify-center gap-0.5">
            <FooterButton onClick={() => setShowBookmarks(true)} icon={Bookmark} label="Bookmarks" badge={bookmarkCount || undefined} />
            <FooterButton onClick={() => setShowMarkov(true)} icon={Network} label="Markov" />
            <FooterButton onClick={() => setShowSettings(true)} icon={Settings} label="Customize" />
            <FooterButton onClick={() => setShowAbout(true)} icon={Info} label="About" />
            <FooterButton onClick={() => setShowShortcuts(true)} icon={Keyboard} label="Shortcuts" />
            <FooterButton
              onClick={() => window.open("https://github.com", "_blank", "noopener")}
              icon={Github}
              label="Source"
            />
          </nav>

          {/* Philosophy */}
          <p className="ws-ticker text-[11px] text-foreground/40">
            of the people · by the people · for the people
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterButton({
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  onClick: () => void;
  icon: typeof Info;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-foreground/55 hover:ws-whisper hover:text-foreground transition-colors"
    >
      <Icon className="size-3.5" strokeWidth={1.75} />
      <span className="hidden sm:inline">{label}</span>
      {badge !== undefined && (
        <span
          className="ml-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums"
          style={{ background: "var(--ws-accent-soft)", color: "var(--ws-accent)" }}
        >
          {badge}
        </span>
      )}
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
