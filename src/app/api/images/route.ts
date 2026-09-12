// WHITE Search — /api/images
// Fast, multi-source, zero-key image search engine.
// Sources: DuckDuckGo Image Service, Wikimedia Commons Open API, and SearXNG Engine.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import { SEARXNG_POOL } from "@/lib/search";
import { isSafeExternalUrl } from "@/lib/security";
import { searchRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

interface ImageResult {
  url: string;
  alt: string;
  source: string;
  sourceUrl: string;
  title: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

const cache = new Map<string, { images: ImageResult[]; at: number }>();
const TTL = 1000 * 60 * 30; // 30 mins

// 1. Fast DuckDuckGo Image Service (High Recall & Low Latency)
async function fetchDuckDuckGoImages(query: string, limit = 50): Promise<ImageResult[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      const res1 = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!res1.ok) return [];
      const html = await res1.text();
      const vqdMatch = html.match(/vqd=["']?([0-9-]+)["']?/i) || html.match(/vqd=([0-9-]+)/i);
      if (!vqdMatch) return [];

      const vqd = vqdMatch[1];
      const res2 = await fetch(
        `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`,
        {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": "https://duckduckgo.com/",
            "Accept": "application/json, text/javascript, */*; q=0.01",
          },
        }
      );

      if (!res2.ok) return [];
      const data = await res2.json();
      const raw = data.results ?? [];

      const results: ImageResult[] = [];
      for (const item of raw.slice(0, limit)) {
        if (!item.image) continue;
        let host = "";
        try {
          host = new URL(item.url || item.image).hostname.replace(/^www\./, "");
        } catch {
          host = item.source || "web";
        }

        results.push({
          url: item.image,
          thumbnailUrl: item.thumbnail || item.image,
          alt: item.title || query,
          title: item.title || query,
          source: host,
          sourceUrl: item.url || item.image,
          width: typeof item.width === "number" ? item.width : undefined,
          height: typeof item.height === "number" ? item.height : undefined,
        });
      }
      return results;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return [];
  }
}

// 2. Fast Wikimedia Commons Image Fetcher (Open & Clean Creative Commons)
async function fetchWikimediaImages(query: string, limit = 20): Promise<ImageResult[]> {
  try {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query
    )}&gsrnamespace=6&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return [];
      const data = await res.json();
      const pages = data.query?.pages;
      if (!pages) return [];

      const results: ImageResult[] = [];
      for (const pageId of Object.keys(pages)) {
        const page = pages[pageId];
        const info = page.imageinfo?.[0];
        if (!info || !info.url) continue;

        // Skip non-standard image formats
        if (!/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(info.url)) continue;

        const title = (page.title || "").replace(/^File:/i, "").replace(/\.[^.]+$/, "");
        results.push({
          url: info.url,
          thumbnailUrl: info.thumburl || info.url,
          alt: title,
          title,
          source: "commons.wikimedia.org",
          sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
          width: info.width,
          height: info.height,
        });
      }
      return results;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return [];
  }
}

// 3. SearXNG Image Search with Parallel Race (Timeout per instance: 1800ms)
async function fetchSearXNGImages(query: string, limit = 24, preferredInstance?: string): Promise<ImageResult[]> {
  const instances = [
    ...(preferredInstance && isSafeExternalUrl(preferredInstance) ? [preferredInstance] : []),
    ...SEARXNG_POOL.filter((u) => u !== preferredInstance && isSafeExternalUrl(u)).slice(0, 3),
  ];

  if (instances.length === 0) return [];

  const queryInstance = async (instance: string): Promise<ImageResult[]> => {
    const instanceUrl = instance.replace(/\/$/, "");
    const url = `${instanceUrl}/search?q=${encodeURIComponent(query)}&categories=images&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) return [];
      const data = await res.json();
      const raw = data.results ?? [];
      if (raw.length === 0) return [];

      const results: ImageResult[] = [];
      for (const item of raw.slice(0, limit)) {
        const imgUrl = item.img_src || item.url;
        if (!imgUrl) continue;
        let host = "";
        try {
          host = new URL(item.url || imgUrl).hostname.replace(/^www\./, "");
        } catch {
          host = item.source || "web";
        }

        results.push({
          url: imgUrl,
          thumbnailUrl: item.thumbnail_src || imgUrl,
          alt: item.title || query,
          title: item.title || query,
          source: host,
          sourceUrl: item.url || imgUrl,
          width: item.width,
          height: item.height,
        });
      }
      return results;
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  };

  // Run top instances in parallel and return the first one with results
  const allFetched = await Promise.allSettled(instances.map(queryInstance));
  for (const item of allFetched) {
    if (item.status === "fulfilled" && item.value.length > 0) {
      return item.value;
    }
  }
  return [];
}

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rate = searchRateLimiter.check(clientIp);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.reset),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rate.reset),
        },
      }
    );
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ images: [] });

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json({ images: cached.images, cached: true });
  }

  try {
    const sessionId = await getOrCreateSessionId();
    const prefs = await db.preferences.findUnique({ where: { sessionId } }).catch(() => null);
    const searxngUrl = prefs?.searxngInstance;

    // Run DDG, Wikimedia, and SearXNG concurrently
    const [ddgResults, wikiResults, searxResults] = await Promise.all([
      fetchDuckDuckGoImages(q, 45),
      fetchWikimediaImages(q, 15),
      fetchSearXNGImages(q, 20, searxngUrl),
    ]);

    // Priority ordering: DDG + Wikimedia + SearXNG
    const combined = [...ddgResults, ...wikiResults, ...searxResults];
    const seenUrls = new Set<string>();
    const uniqueImages: ImageResult[] = [];

    for (const img of combined) {
      if (!seenUrls.has(img.url)) {
        seenUrls.add(img.url);
        uniqueImages.push(img);
      }
    }

    cache.set(cacheKey, { images: uniqueImages, at: Date.now() });

    return NextResponse.json({
      images: uniqueImages,
      total: uniqueImages.length,
      cached: false,
    });
  } catch (e) {
    console.error("[/api/images] error", e);
    return NextResponse.json({ images: [], total: 0 });
  }
}
