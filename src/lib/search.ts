// WHITE Search — Core Search Engine & Multi-Provider Cascade
// Fast, deterministic, privacy-first internet search wrapper.
// Features: LRU Cache, multi-instance SearXNG failover pool, DDG parser,
// search operators (exact phrase, site:, filetype:, -exclude), and local BM25 fallback.

import type { SearchCategory, SearchResponse, SearchResultItem, SearchSource } from "@/lib/types";
import { searchLocalIndex } from "./local-index";
import { isSafeExternalUrl } from "./security";

// High-Performance In-Memory LRU Cache with automatic TTL
class LRUCache<K, V> {
  private capacity: number;
  private ttl: number;
  private map: Map<K, { value: V; at: number }>;

  constructor(capacity = 500, ttl = 1000 * 60 * 30) {
    this.capacity = capacity;
    this.ttl = ttl;
    this.map = new Map();
  }

  get(key: K): V | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at > this.ttl) {
      this.map.delete(key);
      return null;
    }
    // Refresh position for LRU
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  getStale(key: K, maxStaleTtl = 1000 * 60 * 120): V | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() - entry.at > maxStaleTtl) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) this.map.delete(oldestKey);
    }
    this.map.set(key, { value, at: Date.now() });
  }

  clear(): void {
    this.map.clear();
  }
}

const searchCache = new LRUCache<string, SearchResultItem[]>(500, 1000 * 60 * 30);

// Robust SearXNG public instances pool for failover rotation
export const SEARXNG_POOL = [
  "https://searx.be",
  "https://search.ononoki.org",
  "https://searxng.site",
  "https://priv.au",
  "https://searx.work",
  "https://searx.prvcy.eu",
];

export interface SearchOperatorFilter {
  exactPhrases: string[];
  siteFilters: string[];
  excludeTerms: string[];
  filetypeFilters: string[];
  cleanedQuery: string;
}

export function parseSearchOperators(query: string): SearchOperatorFilter {
  let cleaned = query;
  const exactPhrases: string[] = [];
  const siteFilters: string[] = [];
  const excludeTerms: string[] = [];
  const filetypeFilters: string[] = [];

  // Match exact phrases in quotes: "hello world"
  const quoteRegex = /"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = quoteRegex.exec(cleaned)) !== null) {
    if (match[1].trim()) exactPhrases.push(match[1].trim().toLowerCase());
  }
  cleaned = cleaned.replace(quoteRegex, " ").trim();

  // Match site:example.com
  const siteRegex = /\bsite:([^\s]+)/gi;
  while ((match = siteRegex.exec(cleaned)) !== null) {
    if (match[1].trim()) siteFilters.push(match[1].trim().toLowerCase().replace(/^www\./, ""));
  }
  cleaned = cleaned.replace(siteRegex, " ").trim();

  // Match filetype:pdf or ext:pdf
  const filetypeRegex = /\b(?:filetype|ext):([a-z0-9]+)/gi;
  while ((match = filetypeRegex.exec(cleaned)) !== null) {
    if (match[1].trim()) filetypeFilters.push(match[1].trim().toLowerCase());
  }
  cleaned = cleaned.replace(filetypeRegex, " ").trim();

  // Match -exclude terms
  const excludeRegex = /(?:^|\s)-([a-zA-Z0-9_\-]+)/g;
  while ((match = excludeRegex.exec(cleaned)) !== null) {
    if (match[1].trim()) excludeTerms.push(match[1].trim().toLowerCase());
  }
  cleaned = cleaned.replace(excludeRegex, " ").replace(/\s+/g, " ").trim();

  return {
    exactPhrases,
    siteFilters,
    excludeTerms,
    filetypeFilters,
    cleanedQuery: cleaned || query,
  };
}

export function applyOperatorFilters(
  results: SearchResultItem[],
  filters: SearchOperatorFilter
): SearchResultItem[] {
  return results.filter((r) => {
    const text = `${r.name} ${r.snippet} ${r.url} ${r.cleanHost}`.toLowerCase();
    const host = r.cleanHost.toLowerCase();
    const url = r.url.toLowerCase();

    // Check exact phrases
    for (const phrase of filters.exactPhrases) {
      if (!text.includes(phrase)) return false;
    }

    // Check site:
    if (filters.siteFilters.length > 0) {
      const matchSite = filters.siteFilters.some(
        (site) => host === site || host.endsWith("." + site) || url.includes(site)
      );
      if (!matchSite) return false;
    }

    // Check filetype:
    if (filters.filetypeFilters.length > 0) {
      const matchExt = filters.filetypeFilters.some(
        (ext) => url.endsWith(`.${ext}`) || url.includes(`.${ext}?`) || text.includes(ext)
      );
      if (!matchExt) return false;
    }

    // Check -exclude terms
    for (const term of filters.excludeTerms) {
      if (text.includes(term)) return false;
    }

    return true;
  });
}

function cleanHost(host: string): string {
  return host.replace(/^www\./, "");
}

function letterbox(name: string, host: string): string {
  const src = (name || host || "?").trim();
  return src.charAt(0).toUpperCase();
}

function formatDate(date: string): string {
  if (!date || date === "N/A") return "";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

function transform(sources: SearchSource[], category: SearchCategory): SearchResultItem[] {
  return sources.map((s, i) => ({
    ...s,
    id: `${s.url}-${i}`,
    category,
    displayDate: formatDate(s.date),
    cleanHost: cleanHost(s.host_name),
    letterbox: letterbox(s.name, s.host_name),
  }));
}

function dedupe(results: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}



// Clean DuckDuckGo HTML Scraper with robust decoding
async function searchDDGScraper(
  query: string,
  category: SearchCategory,
  num: number,
  recencyDays?: number
): Promise<SearchSource[]> {
  let df = "";
  if (recencyDays) {
    if (recencyDays <= 1) df = "d";
    else if (recencyDays <= 7) df = "w";
    else if (recencyDays <= 31) df = "m";
    else df = "y";
  }

  let finalQuery = query;
  if (category === "news") finalQuery += " news";
  else if (category === "images") finalQuery += " images";
  else if (category === "videos") finalQuery += " videos";

  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(finalQuery)}${df ? `&df=${df}` : ""}`;

  let html = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      let res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!res.ok) {
        res = await fetch("https://html.duckduckgo.com/html/", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
          body: `q=${encodeURIComponent(finalQuery)}${df ? `&df=${df}` : ""}`,
        });
      }

      if (!res.ok) return [];
      html = await res.text();
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    return [];
  }

  const blocks = html.split(/<div\s+class=["']result\s+results_links/i);
  const results: SearchSource[] = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const aMatch = block.match(/class=["']result__a["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!aMatch) continue;

    const rawHref = aMatch[1];
    const title = aMatch[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

    let actualUrl = rawHref;
    const uddgMatch = rawHref.match(/uddg=([^&"]+)/);
    if (uddgMatch) {
      actualUrl = decodeURIComponent(uddgMatch[1]);
    } else if (rawHref.startsWith("//")) {
      actualUrl = "https:" + rawHref;
    }

    const snippetMatch = block.match(/class=["']result__snippet["'][^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch
      ? snippetMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
      : "";

    let host = "";
    try {
      host = new URL(actualUrl).hostname;
    } catch {
      host = "";
    }

    if (actualUrl && title) {
      results.push({
        url: actualUrl,
        name: title,
        snippet,
        host_name: host,
        rank: results.length + 1,
        date: "N/A",
        favicon: `https://external-content.duckduckgo.com/ip3/${host}.ico`,
      });
    }

    if (results.length >= num) break;
  }

  return results;
}

// SearXNG Search with multi-instance failover
async function searchSearXNG(
  query: string,
  category: SearchCategory,
  num: number,
  recencyDays?: number,
  preferredInstance?: string
): Promise<SearchSource[]> {
  const instances = [
    ...(preferredInstance && isSafeExternalUrl(preferredInstance) ? [preferredInstance] : []),
    ...SEARXNG_POOL.filter((u) => u !== preferredInstance && isSafeExternalUrl(u)),
  ];

  let catParam = "general";
  if (category === "news") catParam = "news";
  else if (category === "images") catParam = "images";
  else if (category === "videos") catParam = "videos";

  let timeRange = "";
  if (recencyDays) {
    if (recencyDays <= 1) timeRange = "day";
    else if (recencyDays <= 7) timeRange = "week";
    else if (recencyDays <= 31) timeRange = "month";
    else timeRange = "year";
  }

  for (const instance of instances) {
    const instanceUrl = instance.replace(/\/$/, "");
    let url = `${instanceUrl}/search?q=${encodeURIComponent(query)}&categories=${catParam}&format=json`;
    if (timeRange) url += `&time_range=${timeRange}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          },
        });

        if (!res.ok) continue;
        const data = await res.json();
        const raw = data.results ?? [];
        if (raw.length === 0) continue;

        return raw.slice(0, num).map((r: any, i: number) => {
          let host = "";
          try {
            host = new URL(r.url).hostname;
          } catch {
            host = r.pretty_url || "";
          }
          return {
            url: r.url,
            name: r.title || r.url,
            snippet: r.content || "",
            host_name: host,
            rank: i + 1,
            date: r.publishedDate || "N/A",
            favicon: `https://external-content.duckduckgo.com/ip3/${host}.ico`,
          };
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch {
      // Instance failed or timed out — failover to next in pool
      continue;
    }
  }

  return [];
}

// Master Search Orchestrator with Cascading Failover
export async function runSearch(
  query: string,
  category: SearchCategory = "web",
  num = 20,
  recencyDays?: number,
  searchProvider: "ddg" | "searxng" | "local" = "ddg",
  searxngInstance = "https://searx.be"
): Promise<SearchResponse> {
  const started = Date.now();
  const rawQuery = query.trim();
  const operatorFilters = parseSearchOperators(rawQuery);
  const effectiveQuery = operatorFilters.cleanedQuery || rawQuery;

  const cacheKey = `${searchProvider}:${category}:${rawQuery.toLowerCase()}:${recencyDays ?? "all"}:${searxngInstance}`;

  // 1. Check LRU Cache
  const cachedResults = searchCache.get(cacheKey);
  if (cachedResults) {
    return {
      query: rawQuery,
      category,
      total: cachedResults.length,
      tookMs: Date.now() - started,
      cached: true,
      results: cachedResults,
    };
  }

  const staleFallback = searchCache.getStale(cacheKey);
  let raw: SearchSource[] = [];

  try {
    // 2. Primary Provider Attempt
    if (searchProvider === "local") {
      raw = searchLocalIndex(effectiveQuery, category, Math.min(num, 30));
    } else if (searchProvider === "searxng") {
      raw = await searchSearXNG(effectiveQuery, category, Math.min(num, 30), recencyDays, searxngInstance);
    } else {
      // Default: DuckDuckGo Privacy Engine (Clean HTML Scraper)
      raw = await searchDDGScraper(effectiveQuery, category, Math.min(num, 30), recencyDays);
    }

    // 3. Cascading Fallback Tier 1: If primary failed, try DDG (if not already used)
    if (raw.length === 0 && searchProvider !== "ddg") {
      raw = await searchDDGScraper(effectiveQuery, category, Math.min(num, 30), recencyDays);
    }

    // 4. Cascading Fallback Tier 2: Try SearXNG (if not already used)
    if (raw.length === 0 && searchProvider !== "searxng") {
      raw = await searchSearXNG(effectiveQuery, category, Math.min(num, 30), recencyDays, searxngInstance);
    }

    // 5. Cascading Fallback Tier 3: Local BM25 Engine
    if (raw.length === 0) {
      raw = searchLocalIndex(effectiveQuery, category, Math.min(num, 30));
    }
  } catch (e) {
    if (staleFallback) {
      return {
        query: rawQuery,
        category,
        total: staleFallback.length,
        tookMs: Date.now() - started,
        cached: true,
        results: staleFallback,
      };
    }
    // Emergency offline fallback
    raw = searchLocalIndex(effectiveQuery, category, Math.min(num, 30));
  }

  let results = transform(raw, category);
  results = dedupe(results);

  // Apply search operator filters (exact phrases, site:, filetype:, -exclude)
  results = applyOperatorFilters(results, operatorFilters);

  // Image & Video format filters
  if (category === "images") {
    const imageExt = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
    const imageSites = /unsplash|pexels|flickr|imgur|shutterstock|getty|pixabay|stock|deviantart|behance|dribbble|pinterest|500px/i;
    const imageResults = results.filter((r) => imageExt.test(r.url) || imageSites.test(r.host_name) || imageExt.test(r.snippet));
    if (imageResults.length > 0) results = imageResults;
  } else if (category === "videos") {
    const videoSites = /youtube|youtu\.be|vimeo|dailymotion|twitch/i;
    const videoResults = results.filter((r) => videoSites.test(r.url) || videoSites.test(r.host_name));
    if (videoResults.length > 0) results = videoResults;
  }

  searchCache.set(cacheKey, results);

  return {
    query: rawQuery,
    category,
    total: results.length,
    tookMs: Date.now() - started,
    cached: false,
    results,
  };
}

// Extract HyperTags — keyword chips from a search result's snippet and title
export function extractHyperTags(item: SearchResultItem, allResults: SearchResultItem[]): string[] {
  const tags: string[] = [];
  const text = `${item.name} ${item.snippet}`.toLowerCase();

  const words = text.match(/\b[a-z]{4,}\b/g) ?? [];
  const stopWords = new Set([
    "the", "this", "that", "with", "from", "have", "they", "will", "what",
    "when", "where", "which", "their", "about", "would", "could", "should",
    "there", "these", "those", "being", "under", "after", "before", "between",
    "through", "during", "above", "below", "into", "your", "also", "more",
    "very", "just", "like", "only", "over", "than", "them", "then", "were",
    "been", "some", "such", "each", "other", "every", "most", "both",
  ]);

  const freq = new Map<string, number>();
  for (const w of words) {
    if (stopWords.has(w) || w.length < 4) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  const topKeywords = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  tags.push(...topKeywords);
  tags.push(item.cleanHost);

  const relatedHosts = allResults
    .filter((r) => r.url !== item.url)
    .map((r) => r.cleanHost)
    .filter((h) => h !== item.cleanHost)
    .slice(0, 2);
  tags.push(...relatedHosts);

  return Array.from(new Set(tags)).slice(0, 6);
}
