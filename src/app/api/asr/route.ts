// WHITE Search — /api/asr (voice search)
// Accepts a base64-encoded audio blob (webm/wav/mp3), transcribes it via z-ai ASR,
// and returns the text. The client then runs the search with that text.
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audio } = body as { audio?: string };
    if (!audio) return NextResponse.json({ error: "missing audio" }, { status: 400 });

    // strip data URI prefix if present
    const base64 = audio.replace(/^data:audio\/\w+;base64,/, "");
    const zai = await getZai();
    const response = (await zai.audio.asr.create({ file_base64: base64 })) as { text?: string };
    const text = (response.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Nothing heard. Try again." }, { status: 422 });
    return NextResponse.json({ text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "transcription failed";
    console.error("[/api/asr] error", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
