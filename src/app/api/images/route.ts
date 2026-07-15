// WHITE Search — /api/images
// Fetches actual image URLs for a query by doing a web search, then
// using page_reader on the top results to extract <img> src URLs.
// Returns a list of image objects with url, alt, source, width, height.
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

interface ImageResult {
  url: string;
  alt: string;
  source: string;
  sourceUrl: string;
  title: string;
}

const cache = new Map<string, { images: ImageResult[]; at: number }>();
const TTL = 1000 * 60 * 10;

function extractImageUrls(html: string, baseUrl: string): { url: string; alt: string }[] {
  const images: { url: string; alt: string }[] = [];
  // match <img> tags with src
  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  const imgRegex2 = /<img\s+[^>]*(?:alt=["']([^"']*)["'])?[^>]*src=["']([^"']+)["'][^>]*>/gi;
  const seen = new Set<string>();

  const processMatch = (src: string, alt: string) => {
    if (!src || seen.has(src)) return;
    // resolve relative URLs
    let fullUrl = src;
    if (src.startsWith("//")) {
      fullUrl = "https:" + src;
    } else if (src.startsWith("/")) {
      try {
        fullUrl = new URL(src, baseUrl).href;
      } catch {
        return;
      }
    } else if (!src.startsWith("http")) {
      return;
    }
    // filter out tiny icons, sprites, data URIs, svg placeholders
    if (fullUrl.startsWith("data:")) return;
    if (/\.(svg|ico)$/i.test(fullUrl)) return;
    if (/favicon|sprite|pixel|tracker|analytics|badge|logo/i.test(fullUrl)) return;
    // only keep common image formats
    if (!/\.(png|jpe?g|gif|webp|avif)(\?|$)/i.test(fullUrl)) return;
    seen.add(src);
    images.push({ url: fullUrl, alt: alt || "" });
  };

  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(html)) !== null) {
    processMatch(m[1], m[2] || "");
  }
  while ((m = imgRegex2.exec(html)) !== null) {
    processMatch(m[2], m[1] || "");
  }
  return images;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ images: [] });

  const cacheKey = q.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json({ images: cached.images, cached: true });
  }

  try {
    const zai = await getZai();
    // search for pages that likely have images
    const searchResults = (await zai.functions.invoke("web_search", {
      query: `${q} images photos`,
      num: 8,
    })) as { url?: string; name?: string; host_name?: string; snippet?: string }[];

    const allImages: ImageResult[] = [];
    const seenUrls = new Set<string>();

    // Process top 3 search results SEQUENTIALLY to avoid 429 rate limits
    const pagesToRead = searchResults.slice(0, 3).filter((r) => r.url) as { url: string; name?: string; host_name?: string; snippet?: string }[];
    for (const r of pagesToRead) {
      if (allImages.length >= 24) break; // stop early if we have enough
      try {
        const pageData = (await zai.functions.invoke("page_reader", { url: r.url })) as {
          data?: { html?: string; title?: string };
        };
        const html = pageData.data?.html ?? "";
        const imgs = extractImageUrls(html, r.url);
        for (const img of imgs) {
          if (!seenUrls.has(img.url)) {
            seenUrls.add(img.url);
            allImages.push({
              url: img.url,
              alt: img.alt,
              source: r.host_name ?? "",
              sourceUrl: r.url,
              title: r.name ?? "",
            });
          }
        }
      } catch {
        // best-effort — skip this page on error (likely 429)
      }
    }

    // Also include direct image URLs from search results
    for (const r of searchResults) {
      if (r.url && /\.(png|jpe?g|gif|webp|avif)$/i.test(r.url) && !seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        allImages.push({
          url: r.url,
          alt: r.name ?? "",
          source: r.host_name ?? "",
          sourceUrl: r.url,
          title: r.name ?? "",
        });
      }
    }

    // Deduplicate by URL and limit
    const unique = allImages.slice(0, 40);
    cache.set(cacheKey, { images: unique, at: Date.now() });

    return NextResponse.json({ images: unique, cached: false });
  } catch (e) {
    console.error("[/api/images] error", e);
    return NextResponse.json({ images: [] });
  }
}
