// WHITE Search — Zustand client store
// Holds view state, current query/category, preferences, history, bookmarks,
// popular searches, and the Markov suggestions cache.

import { create } from "zustand";
import type {
  AccentName,
  BookmarkItem,
  Density,
  DomainAction,
  DomainRule,
  FontScale,
  HistoryItem,
  PopularHost,
  PopularQuery,
  PreviewData,
  SearchCategory,
  SearchResultItem,
  SuggestionItem,
  TimeRange,
  UserPreferences,
  ViewState,
  WhiteTheme,
} from "@/lib/types";

export const DEFAULT_PREFS: UserPreferences = {
  sessionId: "",
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
};

interface WhiteStore {
  view: ViewState;
  query: string;
  category: SearchCategory;
  prefs: UserPreferences;
  prefsLoaded: boolean;
  history: HistoryItem[];
  bookmarks: BookmarkItem[];
  popularQueries: PopularQuery[];
  popularHosts: PopularHost[];
  bookmarkUrls: Set<string>;
  domainRules: DomainRule[];
  domainRuleMap: Map<string, DomainAction>;
  suggestions: SuggestionItem[];
  suggestionsLoading: boolean;
  showAbout: boolean;
  showSettings: boolean;
  showShortcuts: boolean;
  showMarkov: boolean;
  showBookmarks: boolean;
  showDomainRules: boolean;
  showStats: boolean;
  showCommand: boolean;
  showHistory: boolean;
  // Reading Mode
  preview: { item: SearchResultItem; data: PreviewData | null; loading: boolean; error: string | null } | null;
  // j/k navigation
  focusedIndex: number;
  // time range filter
  timeRange: TimeRange;
  // search filters
  filterRegion: string;
  filterLanguage: string;

  setView: (v: ViewState) => void;
  setQuery: (q: string) => void;
  setCategory: (c: SearchCategory) => void;
  setPrefs: (p: Partial<UserPreferences>) => void;
  setPrefsFull: (p: UserPreferences) => void;
  setHistory: (h: HistoryItem[]) => void;
  setBookmarks: (b: BookmarkItem[]) => void;
  addBookmark: (b: BookmarkItem) => void;
  removeBookmark: (url: string) => void;
  isBookmarked: (url: string) => boolean;
  setPopular: (q: PopularQuery[], h: PopularHost[]) => void;
  setSuggestions: (s: SuggestionItem[]) => void;
  setSuggestionsLoading: (b: boolean) => void;
  setShowAbout: (b: boolean) => void;
  setShowSettings: (b: boolean) => void;
  setShowShortcuts: (b: boolean) => void;
  setShowMarkov: (b: boolean) => void;
  setShowBookmarks: (b: boolean) => void;
  setShowDomainRules: (b: boolean) => void;
  setShowStats: (b: boolean) => void;
  setShowCommand: (b: boolean) => void;
  setShowHistory: (b: boolean) => void;
  setDomainRules: (r: DomainRule[]) => void;
  setDomainRule: (host: string, action: DomainAction) => void;
  removeDomainRule: (host: string) => void;
  setPreview: (p: WhiteStore["preview"]) => void;
  setFocusedIndex: (i: number | ((prev: number) => number)) => void;
  setTimeRange: (r: TimeRange) => void;
  setFilterRegion: (r: string) => void;
  setFilterLanguage: (l: string) => void;

  resetToHome: () => void;
}

export const useWhite = create<WhiteStore>((set, get) => ({
  view: "home",
  query: "",
  category: "web",
  prefs: DEFAULT_PREFS,
  prefsLoaded: false,
  history: [],
  bookmarks: [],
  popularQueries: [],
  popularHosts: [],
  bookmarkUrls: new Set<string>(),
  domainRules: [],
  domainRuleMap: new Map(),
  suggestions: [],
  suggestionsLoading: false,
  showAbout: false,
  showSettings: false,
  showShortcuts: false,
  showMarkov: false,
  showBookmarks: false,
  showDomainRules: false,
  showStats: false,
  showCommand: false,
  showHistory: false,
  preview: null,
  focusedIndex: -1,
  timeRange: "all" as TimeRange,
  filterRegion: "all",
  filterLanguage: "all",

  setView: (v) => set({ view: v }),
  setQuery: (q) => set({ query: q }),
  setCategory: (c) => set({ category: c }),
  setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
  setPrefsFull: (p) => set({ prefs: p, prefsLoaded: true }),
  setHistory: (h) => set({ history: h }),
  setBookmarks: (b) =>
    set({ bookmarks: b, bookmarkUrls: new Set(b.map((x) => x.url)) }),
  addBookmark: (b) =>
    set((s) => ({
      bookmarks: [b, ...s.bookmarks.filter((x) => x.url !== b.url)],
      bookmarkUrls: new Set([...s.bookmarkUrls, b.url]),
    })),
  removeBookmark: (url) =>
    set((s) => {
      const next = new Set(s.bookmarkUrls);
      next.delete(url);
      return {
        bookmarks: s.bookmarks.filter((x) => x.url !== url),
        bookmarkUrls: next,
      };
    }),
  isBookmarked: (url) => get().bookmarkUrls.has(url),
  setPopular: (q, h) => set({ popularQueries: q, popularHosts: h }),
  setSuggestions: (s) => set({ suggestions: s }),
  setSuggestionsLoading: (b) => set({ suggestionsLoading: b }),
  setShowAbout: (b) => set({ showAbout: b }),
  setShowSettings: (b) => set({ showSettings: b }),
  setShowShortcuts: (b) => set({ showShortcuts: b }),
  setShowMarkov: (b) => set({ showMarkov: b }),
  setShowBookmarks: (b) => set({ showBookmarks: b }),
  setShowDomainRules: (b) => set({ showDomainRules: b }),
  setShowStats: (b) => set({ showStats: b }),
  setShowCommand: (b) => set({ showCommand: b }),
  setShowHistory: (b) => set({ showHistory: b }),
  setDomainRules: (r) =>
    set({
      domainRules: r,
      domainRuleMap: new Map(r.map((x) => [x.host, x.action])),
    }),
  setDomainRule: (host, action) =>
    set((s) => {
      const existing = s.domainRules.find((x) => x.host === host);
      const nextRules = existing
        ? s.domainRules.map((x) => (x.host === host ? { ...x, action, updatedAt: new Date().toISOString() } : x))
        : [{ id: `tmp_${Date.now()}`, host, action, updatedAt: new Date().toISOString() }, ...s.domainRules];
      return {
        domainRules: nextRules,
        domainRuleMap: new Map(nextRules.map((x) => [x.host, x.action])),
      };
    }),
  removeDomainRule: (host) =>
    set((s) => {
      const nextRules = s.domainRules.filter((x) => x.host !== host);
      return {
        domainRules: nextRules,
        domainRuleMap: new Map(nextRules.map((x) => [x.host, x.action])),
      };
    }),
  setPreview: (p) => set({ preview: p }),
  setFocusedIndex: (i) =>
    set((s) => ({
      focusedIndex: typeof i === "function" ? (i as (prev: number) => number)(s.focusedIndex) : i,
    })),
  setTimeRange: (r) => set({ timeRange: r }),
  setFilterRegion: (r) => set({ filterRegion: r }),
  setFilterLanguage: (l) => set({ filterLanguage: l }),

  resetToHome: () => set({ view: "home", query: "", suggestions: [], preview: null, focusedIndex: -1 }),
}));

// Convenience selectors
export const selectTheme = (s: WhiteStore): WhiteTheme => s.prefs.theme;
export const selectAccent = (s: WhiteStore): AccentName => s.prefs.accent;
export const selectDensity = (s: WhiteStore): Density => s.prefs.density;
export const selectFontScale = (s: WhiteStore): FontScale => s.prefs.fontScale;
