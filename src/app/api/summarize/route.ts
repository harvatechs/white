// WHITE Search — /api/summarize
// Generates a clean, concise summary of a web page using OpenAI-compatible API or offline extractor.
// Backend only. Clean, fast, and keyless by default.
import { NextRequest, NextResponse } from "next/server";
import { previewRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;

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
      return "";
    }
    const html = await response.text();
    const text = stripHtml(html).slice(0, 8000);
    cache.set(url, { text, at: Date.now() });
    return text;
  } catch {
    return "";
  }
}

function generateExtractiveSummary(text: string): string {
  const paragraphs = text.split("\n").map(p => p.trim()).filter(p => p.length > 40);
  const result: string[] = [];
  
  if (paragraphs.length > 0) {
    result.push(`• ${paragraphs[0]}`);
  }
  
  let count = 0;
  for (let i = 1; i < paragraphs.length && count < 3; i++) {
    const p = paragraphs[i];
    if (p.length > 80 && p.includes(" ") && !p.includes("|") && !p.includes(">")) {
      const bullet = p.length > 180 ? p.slice(0, 180).trim() + "..." : p;
      result.push(`• ${bullet}`);
      count++;
    }
  }
  
  if (result.length < 2 && paragraphs.length > 1) {
    for (let i = 1; i < Math.min(paragraphs.length, 4); i++) {
      if (!result.includes(`• ${paragraphs[i]}`)) {
        result.push(`• ${paragraphs[i]}`);
      }
    }
  }
  
  return result.join("\n");
}

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rate = previewRateLimiter.check(clientIp);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many summarize requests. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.reset) },
      }
    );
  }

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 });

  try {
    const text = await fetchPageText(url);
    if (!text || text.length < 100) {
      return NextResponse.json({ url, summary: "Not enough main text found on page to generate a summary.", wordCount: text ? text.split(/\s+/).length : 0 }, { status: 200 });
    }

    // 1. Try standard OpenAI / Groq / Ollama / LocalAI if OPENAI_API_KEY is configured
    if (process.env.OPENAI_API_KEY) {
      try {
        const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
        const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
        const aiRes = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are WHITE Search's clean summarizer. You write tight, honest, ad-free summaries. No fluff, no hype. Just the key points a reader needs. Use 3-5 bullet points. Keep it under 150 words.",
              },
              {
                role: "user",
                content: `Summarize this page in 3-5 bullet points. Title context: ${url}\n\nPage content:\n${text}`,
              },
            ],
            temperature: 0.3,
            max_tokens: 300,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const summary = aiData.choices?.[0]?.message?.content?.trim();
          if (summary) {
            return NextResponse.json({ url, summary, wordCount: text.split(/\s+/).length });
          }
        }
      } catch (openAiErr) {
        console.warn("[/api/summarize] OpenAI API call failed, falling back...", openAiErr);
      }
    }



    const summary = generateExtractiveSummary(text);
    return NextResponse.json({
      url,
      summary: `### Quick Summary\n\n${summary}`,
      wordCount: text.split(/\s+/).length,
      isFallback: true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "summarize failed";
    console.warn("[/api/summarize] Unable to retrieve content for summarization:", msg);
    return NextResponse.json({
      url,
      summary: "Unable to generate summary. The target server may be offline, blocking automated requests, or timing out.",
      wordCount: 0,
      isFallback: true,
    }, { status: 200 });
  }
}
