"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Loader2,
  BookOpen,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Copy,
  Check,
  Download,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Type,
} from "lucide-react";
import { useWhite } from "@/lib/store";
import type { SearchResultItem } from "@/lib/types";
import { useEffect, useCallback, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface ReadingPaneProps {
  items: SearchResultItem[];
  onNavigate: (item: SearchResultItem) => void;
}

export function ReadingPane({ items, onNavigate }: ReadingPaneProps) {
  const preview = useWhite((s) => s.preview);
  const setPreview = useWhite((s) => s.setPreview);

  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");

  // Browser-native Text-To-Speech (Web Speech API)
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const close = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlayingTTS(false);
    }
    setPreview(null);
  }, [setPreview]);

  // Stop speech on item change
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [preview?.item?.url]);

  // load preview when item changes
  useEffect(() => {
    if (!preview?.item) return;
    let active = true;
    const url = preview.item.url;
    setTimeout(() => {
      if (active) setPreview({ item: preview.item, data: null, loading: true, error: null });
    }, 0);
    (async () => {
      try {
        const r = await fetch(`/api/preview?url=${encodeURIComponent(url)}`);
        const d = await r.json();
        if (active) {
          if (d.error && !d.isFallback) {
            setPreview({ item: preview.item, data: null, loading: false, error: d.error });
          } else {
            setPreview({ item: preview.item, data: d, loading: false, error: null });
          }
        }
      } catch {
        if (active) setPreview({ item: preview.item, data: null, loading: false, error: "Failed to load preview" });
      }
    })();
    return () => {
      active = false;
    };
  }, [preview?.item?.url]);

  // keyboard nav within pane: j/k to move, Esc to close
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (!preview.item) return;
      const idx = items.findIndex((x) => x.url === preview.item!.url);
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = items[Math.min(idx + 1, items.length - 1)];
        if (next) onNavigate(next);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = items[Math.max(idx - 1, 0)];
        if (next) onNavigate(next);
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview, items, onNavigate, close]);

  const toggleSpeech = () => {
    if (!synthRef.current || !preview?.data?.text) return;

    if (isPlayingTTS) {
      synthRef.current.cancel();
      setIsPlayingTTS(false);
      return;
    }

    synthRef.current.cancel();
    const cleanText = preview.data.text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = speechRate;
    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);
    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
    setIsPlayingTTS(true);
  };

  const handleCopyMarkdown = () => {
    if (!preview?.data?.text) return;
    const md = `# ${preview.data.title || preview.item?.name}\n\nSource: ${preview.item?.url}\n\n${preview.data.text}`;
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!preview?.data?.text) return;
    const md = `# ${preview.data.title || preview.item?.name}\n\nSource: ${preview.item?.url}\n\n${preview.data.text}`;
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(preview.data.title || "article").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fontSizeClass = {
    sm: "text-[14px] leading-[1.65]",
    base: "text-[15.5px] leading-[1.8]",
    lg: "text-[17.5px] leading-[1.9]",
  }[fontSize];

  return (
    <AnimatePresence>
      {preview && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
            onClick={close}
          />
          {/* pane */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 38 }}
            className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[680px] flex-col ws-surface ws-hairline-l shadow-2xl"
            style={{ borderLeft: "1px solid color-mix(in srgb, var(--ws-accent) 10%, transparent)" }}
            role="dialog"
            aria-label="Reading preview"
          >
            {/* header */}
            <header className="flex items-center gap-2 px-5 py-3.5 ws-hairline-b">
              <button
                type="button"
                onClick={() => {
                  const idx = items.findIndex((x) => x.url === preview.item!.url);
                  const prev = items[Math.max(idx - 1, 0)];
                  if (prev) onNavigate(prev);
                }}
                disabled={items.findIndex((x) => x.url === preview.item?.url) === 0}
                className="rounded-lg p-1.5 text-foreground/50 hover:ws-whisper hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Previous result"
              >
                <ChevronLeft className="size-4" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                onClick={() => {
                  const idx = items.findIndex((x) => x.url === preview.item!.url);
                  const next = items[Math.min(idx + 1, items.length - 1)];
                  if (next) onNavigate(next);
                }}
                disabled={items.findIndex((x) => x.url === preview.item?.url) === items.length - 1}
                className="rounded-lg p-1.5 text-foreground/50 hover:ws-whisper hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                aria-label="Next result"
              >
                <ChevronRight className="size-4" strokeWidth={1.75} />
              </button>
              <div className="ml-1 flex min-w-0 flex-1 items-center gap-2">
                <BookOpen className="size-4 shrink-0" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
                <span className="truncate text-[12px] font-medium text-foreground/60">
                  {preview.item?.cleanHost}
                </span>
                {preview.data?.cached && <span className="ws-pill" style={{ opacity: 0.6 }}>cached</span>}
              </div>
              <a
                href={preview.item?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg ws-hairline px-2.5 py-1.5 text-[12px] font-medium hover:ws-whisper transition-colors"
              >
                <ExternalLink className="size-3.5" strokeWidth={1.75} />
                <span className="hidden sm:inline">Open</span>
              </a>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1.5 text-foreground/50 hover:ws-whisper hover:text-foreground transition-colors"
                aria-label="Close reading mode"
              >
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </header>

            {/* Reader Controls Toolbar */}
            {!preview.loading && preview.data && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2 ws-hairline-b bg-muted/20">
                <div className="flex items-center gap-2">
                  {/* Browser TTS Button */}
                  <button
                    type="button"
                    onClick={toggleSpeech}
                    className="inline-flex items-center gap-1.5 rounded-md ws-hairline px-2.5 py-1 text-[11.5px] font-medium hover:ws-whisper transition-colors"
                    title={isPlayingTTS ? "Pause Reading Aloud" : "Read Aloud (Browser Voice)"}
                  >
                    {isPlayingTTS ? (
                      <>
                        <Pause className="size-3.5" style={{ color: "var(--ws-accent)" }} />
                        <span style={{ color: "var(--ws-accent)" }}>Pause Audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="size-3.5 text-foreground/60" />
                        <span>Read Aloud</span>
                      </>
                    )}
                  </button>

                  {/* Speech Rate Cycle */}
                  {isPlayingTTS && (
                    <button
                      type="button"
                      onClick={() => {
                        const rates = [1.0, 1.25, 1.5, 2.0];
                        const nextRate = rates[(rates.indexOf(speechRate) + 1) % rates.length];
                        setSpeechRate(nextRate);
                        if (utteranceRef.current && synthRef.current) {
                          toggleSpeech();
                          setTimeout(toggleSpeech, 50);
                        }
                      }}
                      className="rounded-md ws-hairline px-2 py-1 text-[11px] font-mono hover:ws-whisper"
                    >
                      {speechRate}x
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Font Size Selector */}
                  <div className="inline-flex items-center rounded-md ws-hairline p-0.5">
                    <button
                      type="button"
                      onClick={() => setFontSize("sm")}
                      className={`px-1.5 py-0.5 text-[11px] rounded ${fontSize === "sm" ? "bg-foreground/10 font-bold" : "text-foreground/50"}`}
                      title="Small font"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSize("base")}
                      className={`px-1.5 py-0.5 text-[12px] rounded ${fontSize === "base" ? "bg-foreground/10 font-bold" : "text-foreground/50"}`}
                      title="Default font"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSize("lg")}
                      className={`px-1.5 py-0.5 text-[13px] rounded ${fontSize === "lg" ? "bg-foreground/10 font-bold" : "text-foreground/50"}`}
                      title="Large font"
                    >
                      A
                    </button>
                  </div>

                  {/* Copy Markdown */}
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="inline-flex items-center gap-1 rounded-md ws-hairline px-2 py-1 text-[11.5px] hover:ws-whisper transition-colors"
                    title="Copy article as Markdown"
                  >
                    {copied ? <Check className="size-3 text-green-600" /> : <Copy className="size-3 text-foreground/60" />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>

                  {/* Download Markdown */}
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1 rounded-md ws-hairline px-2 py-1 text-[11.5px] hover:ws-whisper transition-colors"
                    title="Download as .md"
                  >
                    <Download className="size-3 text-foreground/60" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            )}

            {/* body */}
            <div className="ws-scroll flex-1 overflow-y-auto px-7 py-6">
              {preview.loading && (
                <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
                  <Loader2 className="size-6 animate-spin mb-3" style={{ color: "var(--ws-accent)" }} />
                  <p className="text-[13px]">Extracting distraction-free reading view…</p>
                </div>
              )}

              {!preview.loading && preview.error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <AlertCircle className="size-7 mb-3" style={{ color: "var(--destructive)" }} strokeWidth={1.5} />
                  <p className="text-[14px] font-medium">Couldn&rsquo;t fetch reading preview</p>
                  <p className="mt-1 max-w-[320px] text-[12.5px] text-foreground/50">
                    This website may block automated readers or rely on complex client-side scripts.
                  </p>
                  <a
                    href={preview.item?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg ws-hairline px-3 py-2 text-[12.5px] font-medium hover:ws-whisper transition-colors"
                  >
                    <ExternalLink className="size-3.5" strokeWidth={1.75} />
                    Open original site
                  </a>
                </div>
              )}

              {/* ARTICLE VIEW */}
              {!preview.loading && preview.data && (
                <article className="ws-fade-up">
                  <h1 className="text-[24px] font-bold leading-tight tracking-tight text-foreground/90">
                    {preview.data.title || preview.item?.name}
                  </h1>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[12px] text-foreground/50 pb-4 ws-hairline-b">
                    <span className="font-medium text-foreground/70">{preview.item?.cleanHost}</span>
                    {preview.data.publishedTime && (
                      <>
                        <span className="text-foreground/25">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" strokeWidth={1.75} />
                          {new Date(preview.data.publishedTime).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                    <span className="text-foreground/25">·</span>
                    <span>{preview.data.wordCount.toLocaleString()} words</span>
                    <span className="text-foreground/25">·</span>
                    <span>~{Math.max(1, Math.ceil(preview.data.wordCount / 200))} min read</span>
                  </div>

                  <div className={`mt-6 ${fontSizeClass} text-foreground/80 prose dark:prose-invert max-w-none`}>
                    <ReactMarkdown>{preview.data.text}</ReactMarkdown>
                  </div>

                  {preview.data.truncated && (
                    <div className="mt-8 rounded-xl ws-whisper p-4 text-center">
                      <p className="text-[12.5px] text-foreground/50">
                        Article excerpt formatted for clean reading.{" "}
                        <a
                          href={preview.item?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline underline-offset-2"
                          style={{ color: "var(--ws-accent)" }}
                        >
                          Visit original web page →
                        </a>
                      </p>
                    </div>
                  )}
                </article>
              )}
            </div>

            {/* footer hint */}
            <footer className="ws-hairline-t px-5 py-2.5 text-center text-[11px] text-foreground/40">
              <kbd>j</kbd> / <kbd>k</kbd> navigate · <kbd>Esc</kbd> close · 100% Client-side reader
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
