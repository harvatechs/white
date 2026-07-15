// WHITE Search — /api/summarize
// Generates a clean, concise summary of a web page using the LLM.
// Backend only. Uses the page_reader to get content, then the LLM to summarize.
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

// Reuse the preview cache so we don't double-fetch
const cache = new Map<string, { text: string; at: number }>();
const TTL = 1000 * 60 * 10;

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
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

async function fetchPageText(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < TTL) return cached.text;

  const zai = await getZai();
  const result = (await zai.functions.invoke("page_reader", { url })) as {
    data?: { html?: string };
  };
  const text = stripHtml(result.data?.html ?? "").slice(0, 8000);
  cache.set(url, { text, at: Date.now() });
  return text;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

  try {
    const text = await fetchPageText(url);
    if (!text || text.length < 100) {
      return NextResponse.json({ error: "Not enough content to summarize." }, { status: 422 });
    }

    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are WHITE Search's clean summarizer. You write tight, honest, ad-free summaries. No fluff, no hype, no marketing language. Just the key points a reader needs. Use bullet points. Keep it under 150 words. If the content is technical, preserve the key terms. If it's news, lead with the facts.",
        },
        {
          role: "user",
          content: `Summarize this page in 3-5 bullet points. Title context: ${url}\n\nPage content:\n${text}`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const summary = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ url, summary, wordCount: text.split(/\s+/).length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "summarize failed";
    console.error("[/api/summarize] error", e);
    return NextResponse.json({ error: msg, url, summary: "" }, { status: 500 });
  }
}
