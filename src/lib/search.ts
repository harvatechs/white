// WHITE Search — search wrapper around z-ai-web-dev-sdk
// Backend only. Caches results in-memory for friction-less repeat queries.

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
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

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

export async function runSearch(
  query: string,
  category: SearchCategory = "web",
  num = 12,
  recencyDays?: number
): Promise<SearchResponse> {
  const started = Date.now();
  const key = `${category}:${query.toLowerCase().trim()}:${recencyDays ?? "all"}`;

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

  const zai = await getZai();

  // news gets a recency filter; explicit recencyDays overrides
  const args: { query: string; num: number; recency_days?: number } = { query, num };
  if (recencyDays && recencyDays > 0) {
    args.recency_days = recencyDays;
  } else if (category === "news") {
    args.recency_days = 7;
  }

  // For images, request more results and use image-oriented query
  if (category === "images") {
    args.num = Math.min(num * 2, 30);
    args.query = `${query} images`;
  }

  const raw = (await zai.functions.invoke("web_search", args)) as SearchSource[];

  let results = transform(raw ?? [], category);

  // images / videos: filter by url hints (best-effort, since SDK returns web results)
  if (category === "images") {
    // Keep results that either have an image URL or are from image-sharing sites
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
    if (results.length === 0) results = transform(raw ?? [], category);
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
