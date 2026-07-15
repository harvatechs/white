// WHITE Search — /api/preview (Reading Mode)
// Fetches a clean, readable preview of a page using z-ai page_reader.
// Backend only. Returns title, text excerpt, and a word count.
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

// Simple in-memory cache (10 min)
const cache = new Map<string, { data: unknown; at: number }>();
const TTL = 1000 * 60 * 10;

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, String.fromCharCode(34))
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < TTL) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  try {
    const zai = await getZai();
    const result = (await zai.functions.invoke("page_reader", { url })) as {
      data?: { title?: string; url?: string; html?: string; publishedTime?: string };
    };

    const data = result.data ?? {};
    const html = data.html ?? "";
    const text = stripHtml(html);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    // truncate to ~4000 chars for the preview
    const excerpt = text.slice(0, 6000);

    const payload = {
      url,
      title: data.title ?? "",
      publishedTime: data.publishedTime ?? "",
      text: excerpt,
      wordCount,
      truncated: wordCount > 1000,
    };

    cache.set(url, { data: payload, at: Date.now() });
    return NextResponse.json({ ...payload, cached: false });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "preview failed";
    console.error("[/api/preview] error", e);
    return NextResponse.json(
      { error: msg, url, title: "", text: "", wordCount: 0, publishedTime: "" },
      { status: 500 }
    );
  }
}
