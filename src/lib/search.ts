// WHITE Search — search wrapper around z-ai-web-dev-sdk
// Backend only. Caches results in-memory for friction-less repeat queries.
// Rate-limit resilient: exponential backoff, stale-while-revalidate, multi-query expansion.

import ZAI from "z-ai-web-dev-sdk";
import type { SearchCategory, SearchResponse, SearchResultItem, SearchSource } from "@/lib/types";

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

interface CacheEntry {
  results: SearchResultItem[];
  at: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes (was 10)
const STALE_TTL = 1000 * 60 * 120; // 2 hours stale fallback

// Request deduplication — prevent duplicate concurrent searches
const inflight = new Map<string, Promise<SearchSource[]>>();

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

// Deduplicate results by URL
function dedupe(results: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

// SDK call with exponential backoff retry for rate limits
async function searchWithRetry(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  args: { query: string; num: number; recency_days?: number }
): Promise<SearchSource[]> {
  const maxRetries = 3;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const raw = (await zai.functions.invoke("web_search", args)) as SearchSource[];
      return raw ?? [];
    } catch (e) {
      lastError = e;
      const is429 = e instanceof Error && (e.message.includes("429") || e.message.includes("Too many requests"));

      if (is429 && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw lastError ?? new Error("search failed after retries");
}

// Run multiple search queries to gather more results
async function searchExpanded(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  query: string,
  num: number,
  recencyDays?: number
): Promise<SearchSource[]> {
  // Primary search — request max results (30)
  const primaryArgs: { query: string; num: number; recency_days?: number } = {
    query,
    num: Math.min(num, 30),
  };
  if (recencyDays && recencyDays > 0) primaryArgs.recency_days = recencyDays;

  const primary = await searchWithRetry(zai, primaryArgs);

  // If we got enough results, return them
  if (primary.length >= num) return primary;

  // Try expansion queries to get more results
  const expansions = [
    `${query} guide`,
    `${query} overview`,
    `${query} explained`,
  ];

  const allResults = [...primary];
  const seenUrls = new Set(primary.map((r) => r.url));

  for (const expQuery of expansions) {
    if (allResults.length >= num) break;
    try {
      const expArgs: { query: string; num: number; recency_days?: number } = {
        query: expQuery,
        num: 15,
      };
      if (recencyDays && recencyDays > 0) expArgs.recency_days = recencyDays;

      const expanded = await searchWithRetry(zai, expArgs);
      for (const r of expanded) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url);
          allResults.push(r);
        }
      }
    } catch {
      // expansion failed — continue with what we have
    }
  }

  return allResults;
}

export async function runSearch(
  query: string,
  category: SearchCategory = "web",
  num = 20,
  recencyDays?: number
): Promise<SearchResponse> {
  const started = Date.now();
  const key = `${category}:${query.toLowerCase().trim()}:${recencyDays ?? "all"}`;

  // Check cache first — return immediately if fresh
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return {
      query,
      category,
      total: cached.results.length,
      tookMs: Date.now() - started,
      cached: true,
      results: cached.results,
    };
  }

  // If stale cache exists, save it as fallback
  const staleFallback = cached && Date.now() - cached.at < STALE_TTL ? cached : null;

  const zai = await getZai();

  // news gets a recency filter; explicit recencyDays overrides
  const args: { query: string; num: number; recency_days?: number } = { query, num: Math.min(num, 30) };
  if (recencyDays && recencyDays > 0) {
    args.recency_days = recencyDays;
  } else if (category === "news") {
    args.recency_days = 7;
  }

  // For images, use image-oriented query
  if (category === "images") {
    args.num = 30;
    args.query = `${query} images photos`;
  }

  let raw: SearchSource[];
  try {
    if (category === "images") {
      raw = await searchWithRetry(zai, args);
    } else {
      raw = await searchExpanded(zai, args.query, args.num, recencyDays);
    }
  } catch (e) {
    // On rate limit failure, return stale cache if available
    if (staleFallback) {
      return {
        query,
        category,
        total: staleFallback.results.length,
        tookMs: Date.now() - started,
        cached: true,
        results: staleFallback.results,
      };
    }
    throw e;
  }

  let results = transform(raw, category);
  results = dedupe(results);

  // images / videos: filter by url hints (best-effort, since SDK returns web results)
  if (category === "images") {
    const imageExt = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
    const imageSites = /unsplash|pexels|flickr|imgur|shutterstock|getty|pixabay|stock|deviantart|behance|dribbble|pinterest|500px/i;
    const imageResults = results.filter(
      (r) => imageExt.test(r.url) || imageSites.test(r.host_name) || imageExt.test(r.snippet)
    );
    results = imageResults.length > 0 ? imageResults : results;
  }
  if (category === "videos") {
    results = results.filter(
      (r) => /youtube|youtu\.be|vimeo|dailymotion|twitch/i.test(r.url) || /youtube|vimeo/i.test(r.host_name)
    );
    if (results.length === 0) results = transform(raw, category);
  }

  cache.set(key, { results, at: Date.now() });

  return {
    query,
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

  // 1. Extract meaningful keywords from the result's own text
  const words = text.match(/\b[a-z]{4,}\b/g) ?? [];
  const stopWords = new Set([
    "the", "this", "that", "with", "from", "have", "they", "will", "what",
    "when", "where", "which", "their", "about", "would", "could", "should",
    "there", "these", "those", "being", "under", "after", "before", "between",
    "through", "during", "above", "below", "into", "your", "also", "more",
    "very", "just", "like", "only", "over", "than", "them", "then", "were",
    "been", "some", "such", "each", "other", "every", "most", "both",
  ]);

  // Count word frequency
  const freq = new Map<string, number>();
  for (const w of words) {
    if (stopWords.has(w) || w.length < 4) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  // Get top 5 keywords by frequency
  const topKeywords = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  tags.push(...topKeywords);

  // 2. Add the domain name as a tag
  tags.push(item.cleanHost);

  // 3. Add related search terms from other results' hosts
  const relatedHosts = allResults
    .filter((r) => r.url !== item.url)
    .map((r) => r.cleanHost)
    .filter((h) => h !== item.cleanHost)
    .slice(0, 2);
  tags.push(...relatedHosts);

  // Deduplicate and limit to 6 tags
  const unique = Array.from(new Set(tags)).slice(0, 6);
  return unique;
}
