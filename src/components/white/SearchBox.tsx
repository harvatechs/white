"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight, Sparkles, Clock, TrendingUp, CornerDownLeft, Zap, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhite } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import type { SuggestionItem } from "@/lib/types";
import { parseBang, getMatchingBangs, type BangItem } from "@/lib/bangs";
import { VoiceSearchButton } from "./VoiceSearchButton";

export interface SearchBoxHandle {
  focus: () => void;
  setValue: (v: string) => void;
}

interface SearchBoxProps {
  size?: "lg" | "md";
  autoFocus?: boolean;
  onSubmit?: (q: string) => void;
  className?: string;
}

const SOURCE_ICON = {
  markov: Sparkles,
  history: Clock,
  popular: TrendingUp,
};

function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export const SearchBox = forwardRef<SearchBoxHandle, SearchBoxProps>(
  ({ size = "md", autoFocus = false, onSubmit, className }, ref) => {
    const { toast } = useToast();
    const value = useWhite((s) => s.query);
    const setValue = useWhite((s) => s.setQuery);
    const prefs = useWhite((s) => s.prefs);
    const suggestions = useWhite((s) => s.suggestions);
    const setSuggestions = useWhite((s) => s.setSuggestions);
    const setLoading = useWhite((s) => s.setSuggestionsLoading);
    const loading = useWhite((s) => s.suggestionsLoading);

    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [focused, setFocused] = useState(false);
    const [matchingBangs, setMatchingBangs] = useState<BangItem[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const boxRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reqIdRef = useRef(0);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      setValue: (v: string) => setValue(v),
    }));

    // click outside to close
    useEffect(() => {
      function onDoc(e: MouseEvent) {
        if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
          setOpen(false);
          setFocused(false);
        }
      }
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const fetchSuggestions = useCallback(
      async (q: string) => {
        if (!q.trim() || !prefs.markovEnabled) {
          setSuggestions([]);
          setLoading(false);
          return;
        }
        setLoading(true);
        const myReq = ++reqIdRef.current;
        try {
          const res = await fetch(
            `/api/suggest?q=${encodeURIComponent(q)}&limit=${prefs.suggestionCount}`
          );
          const data = (await res.json()) as { suggestions: SuggestionItem[] };
          if (myReq === reqIdRef.current) {
            setSuggestions(data.suggestions ?? []);
          }
        } catch {
          if (myReq === reqIdRef.current) setSuggestions([]);
        } finally {
          if (myReq === reqIdRef.current) setLoading(false);
        }
      },
      [prefs.markovEnabled, prefs.suggestionCount, setSuggestions, setLoading]
    );

    const handleChange = (v: string) => {
      setValue(v);
      setActive(-1);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!v.trim()) {
        setSuggestions([]);
        setMatchingBangs([]);
        setOpen(false);
        return;
      }

      // Check if user is typing a bang (!...)
      const customBangs = (prefs.customBangs as any) || [];
      if (v.trim().startsWith("!")) {
        const bangs = getMatchingBangs(v.trim(), customBangs, 8);
        setMatchingBangs(bangs);
      } else {
        setMatchingBangs([]);
      }

      setOpen(true);
      debounceRef.current = setTimeout(() => fetchSuggestions(v), 60);
    };

    const submit = (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;

      const customBangs = (prefs.customBangs as any) || [];
      const bangRes = parseBang(trimmed, customBangs);

      if (bangRes.hasBang && bangRes.targetUrl) {
        setOpen(false);
        setFocused(false);
        inputRef.current?.blur();
        toast({
          title: `Direct to ${bangRes.bang?.name}`,
          description: bangRes.cleanQuery ? `Searching for "${bangRes.cleanQuery}"` : `Opening ${bangRes.bang?.name}`,
        });
        window.open(bangRes.targetUrl, prefs.openNewTab ? "_blank" : "_self");
        return;
      }

      setOpen(false);
      setFocused(false);
      inputRef.current?.blur();
      onSubmit?.(trimmed);
    };

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const totalOptions = matchingBangs.length > 0 ? matchingBangs.length : suggestions.length;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setActive((a) => Math.min(a + 1, totalOptions - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (matchingBangs.length > 0 && active >= 0 && matchingBangs[active]) {
          const bang = matchingBangs[active];
          setValue(`!${bang.prefix} `);
          setMatchingBangs([]);
          inputRef.current?.focus();
        } else if (active >= 0 && suggestions[active]) {
          submit(suggestions[active].text);
        } else {
          submit(value);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
        setActive(-1);
        inputRef.current?.blur();
      } else if (e.key === "Tab") {
        if (matchingBangs.length > 0 && active >= 0 && matchingBangs[active]) {
          e.preventDefault();
          setValue(`!${matchingBangs[active].prefix} `);
          setMatchingBangs([]);
        } else if (active >= 0 && suggestions[active]) {
          e.preventDefault();
          setValue(suggestions[active].text);
          setActive(-1);
        }
      }
    };

    const isLg = size === "lg";
    const visible = open && (matchingBangs.length > 0 || suggestions.length > 0 || (loading && value.trim().length > 0));
    const hasValue = value.trim().length > 0;

    return (
      <div ref={boxRef} className={cn("relative w-full", className)}>
        <motion.div
          animate={{
            boxShadow: focused
              ? isLg
                ? "0 2px 8px rgba(0,0,0,0.04), 0 12px 48px rgba(0,0,0,0.08)"
                : "0 1px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)"
              : "0 1px 2px rgba(0,0,0,0.03)",
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "ws-searchfield-luxury flex items-center gap-2 sm:gap-3 rounded-2xl transition-colors",
            isLg ? "px-4 py-3.5 sm:px-6 sm:py-5" : "px-3.5 py-2.5 sm:px-4 sm:py-3"
          )}
          data-focused={focused}
        >
          <Search
            className={cn("shrink-0 transition-colors", isLg ? "size-5" : "size-4")}
            style={{ color: focused ? "var(--ws-accent)" : "color-mix(in srgb, var(--foreground) 35%, transparent)" }}
            strokeWidth={1.75}
          />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => {
              setFocused(true);
              if (value.trim()) {
                setOpen(true);
                if (suggestions.length === 0 && !loading) {
                  fetchSuggestions(value);
                }
              }
            }}
            autoFocus={autoFocus}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={isLg ? "Search the open web (or type !w, !gh, !so...)" : "Search or type !"}
            className={cn(
              "flex-1 bg-transparent outline-none placeholder:text-foreground/35 transition-colors",
              isLg ? "text-base sm:text-lg md:text-xl" : "text-sm sm:text-base"
            )}
            aria-label="Search query"
            role="combobox"
            aria-expanded={visible}
            aria-controls="ws-suggest-list"
            aria-autocomplete="list"
          />
          {hasValue && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setSuggestions([]);
                setMatchingBangs([]);
                inputRef.current?.focus();
              }}
              className="shrink-0 rounded-full p-1 text-foreground/30 hover:text-foreground/60 transition-colors"
              aria-label="Clear search"
            >
              <X className="size-4" strokeWidth={1.75} />
            </button>
          )}
          <VoiceSearchButton
            onTranscript={(text) => {
              setValue(text);
              submit(text);
            }}
            size={isLg ? "md" : "sm"}
          />
          {hasValue && (
            <button
              type="button"
              onClick={() => submit(value)}
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl transition-all active:scale-95",
                isLg ? "size-10" : "size-8"
              )}
              style={{ background: "var(--ws-accent)", color: "#fff" }}
              aria-label="Search"
            >
              <ArrowRight className={isLg ? "size-4" : "size-3.5"} strokeWidth={2} />
            </button>
          )}
        </motion.div>

        <AnimatePresence>
          {visible && (
            <motion.div
              id="ws-suggest-list"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="ws-surface absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-foreground/8 backdrop-blur-xl"
              style={{
                background: "color-mix(in srgb, var(--ws-surface) 94%, transparent)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
              }}
              role="listbox"
            >
              {/* BANGS AUTOCOMPLETE LIST */}
              {matchingBangs.length > 0 && (
                <div className="p-1.5 ws-hairline-b">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
                    <Zap className="size-3" style={{ color: "var(--ws-accent)" }} />
                    <span>Search Bangs (Direct Shortcuts)</span>
                  </div>
                  {matchingBangs.map((bang, i) => (
                    <div
                      key={bang.prefix}
                      role="option"
                      aria-selected={i === active}
                      data-active={i === active}
                      className="ws-suggestion-luxury flex items-center justify-between"
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setValue(`!${bang.prefix} `);
                        setMatchingBangs([]);
                        inputRef.current?.focus();
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="font-mono text-[12.5px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "var(--ws-accent-soft)", color: "var(--ws-accent)" }}
                        >
                          !{bang.prefix}
                        </span>
                        <span className="text-[14px] font-medium truncate">{bang.name}</span>
                      </div>
                      <span className="text-[11.5px] text-foreground/40 uppercase tracking-wider">
                        {bang.category}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* STANDARD SUGGESTIONS */}
              {matchingBangs.length === 0 && (
                <>
                  {loading && suggestions.length === 0 && (
                    <div className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-foreground/45">
                      <Sparkles className="size-3.5 animate-pulse" style={{ color: "var(--ws-accent)" }} strokeWidth={1.75} />
                      Thinking…
                    </div>
                  )}
                  {suggestions.map((sug, i) => {
                    const Icon = SOURCE_ICON[sug.source] ?? Sparkles;
                    return (
                      <div
                        key={sug.text + i}
                        role="option"
                        aria-selected={i === active}
                        data-active={i === active}
                        className="ws-suggestion-luxury"
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          submit(sug.text);
                        }}
                      >
                        <Icon
                          className="size-4 shrink-0 transition-colors"
                          style={{
                            color: i === active ? "var(--ws-accent)" : "color-mix(in srgb, var(--foreground) 35%, transparent)",
                          }}
                          strokeWidth={1.75}
                        />
                        <span className="flex-1 truncate text-[14px] sm:text-[15px]">
                          {highlight(sug.text, value)}
                        </span>
                        {i === active && (
                          <CornerDownLeft className="size-3 shrink-0 text-foreground/30" strokeWidth={1.75} />
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SearchBox.displayName = "SearchBox";
