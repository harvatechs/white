// WHITE Search — Zustand client store
// Holds view state, current query/category, preferences, history, bookmarks,
// popular searches, and the Markov suggestions cache.

import { create } from "zustand";
import type {
  AccentName,
  BookmarkItem,
  Density,
  FontScale,
  HistoryItem,
  PopularHost,
  PopularQuery,
  SearchCategory,
  SuggestionItem,
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
  suggestions: SuggestionItem[];
  suggestionsLoading: boolean;
  showAbout: boolean;
  showSettings: boolean;
  showShortcuts: boolean;
  showMarkov: boolean;
  showBookmarks: boolean;

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
  suggestions: [],
  suggestionsLoading: false,
  showAbout: false,
  showSettings: false,
  showShortcuts: false,
  showMarkov: false,
  showBookmarks: false,

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

  resetToHome: () => set({ view: "home", query: "", suggestions: [] }),
}));

// Convenience selectors
export const selectTheme = (s: WhiteStore): WhiteTheme => s.prefs.theme;
export const selectAccent = (s: WhiteStore): AccentName => s.prefs.accent;
export const selectDensity = (s: WhiteStore): Density => s.prefs.density;
export const selectFontScale = (s: WhiteStore): FontScale => s.prefs.fontScale;
