// WHITE Search — shared types

export type SearchCategory = "web" | "news" | "images" | "videos";

export interface SearchSource {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  rank: number;
  date: string;
  favicon: string;
}

export interface SearchResultItem extends SearchSource {
  id: string;
  category: SearchCategory;
  displayDate: string;
  cleanHost: string;
  letterbox: string; // single-letter avatar fallback
}

export interface SearchResponse {
  query: string;
  category: SearchCategory;
  total: number;
  tookMs: number;
  cached: boolean;
  results: SearchResultItem[];
}

export interface SuggestionItem {
  text: string;
  score: number; // 0..1 confidence
  source: "markov" | "history" | "popular";
}

export type WhiteTheme =
  | "pure"
  | "ivory"
  | "snow"
  | "pearl"
  | "alabaster"
  | "ghost"
  | "seashell"
  | "mint";

export type Density = "comfortable" | "compact" | "airy";
export type FontScale = "small" | "base" | "large";
export type AccentName = "graphite" | "sage" | "rose" | "amber" | "slate";

export interface UserPreferences {
  sessionId: string;
  theme: WhiteTheme;
  density: Density;
  fontScale: FontScale;
  safeSearch: boolean;
  openNewTab: boolean;
  showFavicons: boolean;
  markovEnabled: boolean;
  suggestionCount: number;
  accent: AccentName;
}

export interface HistoryItem {
  id: string;
  query: string;
  category: SearchCategory;
  resultsCount: number;
  createdAt: string;
}

export type ViewState = "home" | "results";
