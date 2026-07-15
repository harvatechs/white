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
  customAccent: string | null; // hex color, overrides accent when set
  searchAlgorithm: SearchAlgorithm;
}

export interface HistoryItem {
  id: string;
  query: string;
  category: SearchCategory;
  resultsCount: number;
  createdAt: string;
  clicked?: boolean;
}

export interface BookmarkItem {
  id: string;
  query: string;
  url: string;
  title: string;
  host: string;
  snippet: string;
  category: SearchCategory;
  createdAt: string;
}

export interface PopularQuery {
  query: string;
  count: number;
}

export interface PopularHost {
  host: string;
  count: number;
}

export type DomainAction = "raise" | "lower" | "block";

export interface DomainRule {
  id: string;
  host: string;
  action: DomainAction;
  updatedAt: string;
}

export interface PreviewData {
  url: string;
  title: string;
  publishedTime: string;
  text: string;
  wordCount: number;
  truncated: boolean;
  cached?: boolean;
  error?: string;
}

export interface MarkovStats {
  nodes: number;
  edges: number;
  totalFrequency: number;
}

export interface MarkovInspectorData {
  stats: MarkovStats;
  topStarts: { token: string; startCount: number; frequency: number }[];
  topTokens: { token: string; frequency: number; startCount: number }[];
  topEdges: { fromToken: string; toToken: string; weight: number }[];
  tokenTransitions: { toToken: string; weight: number }[];
}

export type ViewState = "home" | "results";

export type TimeRange = "all" | "day" | "week" | "month" | "year";

export type SearchAlgorithm = "relevance" | "recency" | "diverse" | "markov" | "alphabetical";
