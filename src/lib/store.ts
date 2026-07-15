// WHITE Search — Zustand client store
// Holds view state, current query/category, preferences, history (in-memory),
// and the Markov suggestions cache.

import { create } from "zustand";
import type {
  AccentName,
  Density,
  FontScale,
  HistoryItem,
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
  suggestions: SuggestionItem[];
  suggestionsLoading: boolean;
  showAbout: boolean;
  showSettings: boolean;

  setView: (v: ViewState) => void;
  setQuery: (q: string) => void;
  setCategory: (c: SearchCategory) => void;
  setPrefs: (p: Partial<UserPreferences>) => void;
  setPrefsFull: (p: UserPreferences) => void;
  setHistory: (h: HistoryItem[]) => void;
  setSuggestions: (s: SuggestionItem[]) => void;
  setSuggestionsLoading: (b: boolean) => void;
  setShowAbout: (b: boolean) => void;
  setShowSettings: (b: boolean) => void;

  resetToHome: () => void;
}

export const useWhite = create<WhiteStore>((set) => ({
  view: "home",
  query: "",
  category: "web",
  prefs: DEFAULT_PREFS,
  prefsLoaded: false,
  history: [],
  suggestions: [],
  suggestionsLoading: false,
  showAbout: false,
  showSettings: false,

  setView: (v) => set({ view: v }),
  setQuery: (q) => set({ query: q }),
  setCategory: (c) => set({ category: c }),
  setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
  setPrefsFull: (p) => set({ prefs: p, prefsLoaded: true }),
  setHistory: (h) => set({ history: h }),
  setSuggestions: (s) => set({ suggestions: s }),
  setSuggestionsLoading: (b) => set({ suggestionsLoading: b }),
  setShowAbout: (b) => set({ showAbout: b }),
  setShowSettings: (b) => set({ showSettings: b }),

  resetToHome: () => set({ view: "home", query: "", suggestions: [] }),
}));

// Convenience selectors
export const selectTheme = (s: WhiteStore): WhiteTheme => s.prefs.theme;
export const selectAccent = (s: WhiteStore): AccentName => s.prefs.accent;
export const selectDensity = (s: WhiteStore): Density => s.prefs.density;
export const selectFontScale = (s: WhiteStore): FontScale => s.prefs.fontScale;
