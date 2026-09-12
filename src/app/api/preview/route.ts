// WHITE Search — /api/preview (Reading Mode)
// Fetches a clean, readable preview of a page using native HTML-to-Markdown reader.
// Backend only. Returns title, text excerpt, and word count.
import { NextRequest, NextResponse } from "next/server";
import { isSafeExternalUrl } from "@/lib/security";
import { previewRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Simple in-memory cache (10 min)
interface PreviewCacheData {
  url: string;
  title: string;
  publishedTime: string;
  text: string;
  wordCount: number;
  truncated: boolean;
}
const cache = new Map<string, { data: PreviewCacheData; at: number }>();
const TTL = 1000 * 60 * 10;

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Headings
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, "\n\n#### $1\n\n")
    // Block elements
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "\n\n> $1\n\n")
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "\n\n```\n$1\n```\n\n")
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, "`$1`")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n* $1")
    .replace(/<\/(p|div|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // Links and formatting
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    // Strip remaining tags
    .replace(/<[^>]*>/g, "")
    // Decode HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rate = previewRateLimiter.check(clientIp);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many reading mode requests. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.reset) },
      }
    );
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

  // Prevent SSRF / Private Network Scans
  if (!isSafeExternalUrl(url)) {
    return NextResponse.json({ error: "Restricted or invalid target URL" }, { status: 400 });
  }

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  // Native privacy-first reader fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Fallback fetch status: ${response.status}`);
    }
    const html = await response.text();
    
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";
    
    const text = htmlToMarkdown(html);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const excerpt = text.slice(0, 6000);

    let hostname = "";
    try { hostname = new URL(url).hostname; } catch {}

    const payload = {
      url,
      title: title || hostname || "Page Preview",
      publishedTime: new Date().toISOString().split("T")[0],
      text: excerpt || "No readable main text extracted from page.",
      wordCount,
      truncated: wordCount > 1000,
    };

    cache.set(url, { data: payload, at: Date.now() });
    return NextResponse.json({ ...payload, cached: false, isFallback: true });
  } catch (fallbackError: unknown) {
    const msg = fallbackError instanceof Error ? fallbackError.message : "preview failed";
    return NextResponse.json(
      {
        error: msg,
        url,
        title: "Preview Unavailable",
        text: "Unable to load reading view for this page. The target server may be offline, blocking automated requests, or timing out.",
        wordCount: 0,
        publishedTime: "",
        isFallback: true,
      },
      { status: 200 }
    );
  }
}
