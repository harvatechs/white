"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight, Sparkles, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhite } from "@/lib/store";
import type { SuggestionItem } from "@/lib/types";

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
    const value = useWhite((s) => s.query);
    const setValue = useWhite((s) => s.setQuery);
    const prefs = useWhite((s) => s.prefs);
    const suggestions = useWhite((s) => s.suggestions);
    const setSuggestions = useWhite((s) => s.setSuggestions);
    const setLoading = useWhite((s) => s.setSuggestionsLoading);
    const loading = useWhite((s) => s.suggestionsLoading);

    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
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
        setOpen(false);
        return;
      }
      setOpen(true);
      debounceRef.current = setTimeout(() => fetchSuggestions(v), 90);
    };

    const submit = (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setOpen(false);
      inputRef.current?.blur();
      onSubmit?.(trimmed);
    };

    const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setActive((a) => Math.min(a + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (active >= 0 && suggestions[active]) {
          submit(suggestions[active].text);
        } else {
          submit(value);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
        setActive(-1);
      }
    };

    const isLg = size === "lg";
    const visible = open && (suggestions.length > 0 || (loading && value.trim()));

    return (
      <div ref={boxRef} className={cn("relative w-full", className)}>
        <div
          className={cn(
            "ws-searchfield ws-ring flex items-center gap-3 rounded-2xl",
            isLg ? "px-6 py-4 md:py-5" : "px-4 py-3"
          )}
        >
          <Search
            className={cn("shrink-0", isLg ? "size-5" : "size-4")}
            style={{ color: "var(--ws-accent)" }}
            strokeWidth={1.75}
          />
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => value.trim() && setOpen(true)}
            autoFocus={autoFocus}
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={isLg ? "Search the open web — no ads, no sponsors" : "Search WHITE"}
            className={cn(
              "flex-1 bg-transparent outline-none placeholder:text-foreground/35",
              isLg ? "text-lg md:text-xl" : "text-base"
            )}
            aria-label="Search query"
            role="combobox"
            aria-expanded={visible}
            aria-controls="ws-suggest-list"
            aria-autocomplete="list"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                setSuggestions([]);
                inputRef.current?.focus();
              }}
              className="rounded-full p-1 text-foreground/40 hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}
          {value.trim() && (
            <button
              type="button"
              onClick={() => submit(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
                isLg ? "text-sm" : "text-xs"
              )}
              style={{ background: "var(--ws-accent)", color: "#fff" }}
              aria-label="Search"
            >
              <span className="hidden sm:inline">Search</span>
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>

        <AnimatePresence>
          {visible && (
            <motion.div
              id="ws-suggest-list"
              initial={{ opacity: 0, y: -4, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.99 }}
              transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="ws-surface ws-hairline absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl shadow-xl"
              style={{
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.06)",
              }}
              role="listbox"
            >
              {loading && suggestions.length === 0 && (
                <div className="px-4 py-3 text-sm text-foreground/50">Thinking…</div>
              )}
              {suggestions.map((sug, i) => {
                const Icon = SOURCE_ICON[sug.source] ?? Sparkles;
                return (
                  <div
                    key={sug.text + i}
                    role="option"
                    aria-selected={i === active}
                    data-active={i === active}
                    className="ws-suggestion"
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      submit(sug.text);
                    }}
                  >
                    <Icon
                      className="size-4 shrink-0"
                      style={{ color: "var(--ws-accent)", opacity: 0.65 }}
                      strokeWidth={1.75}
                    />
                    <span className="ws-sug-text flex-1 truncate">
                      {highlight(sug.text, value)}
                    </span>
                    <span className="ws-pill" style={{ opacity: 0.7 }}>
                      {sug.source}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SearchBox.displayName = "SearchBox";
