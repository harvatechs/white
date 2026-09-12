// WHITE Search — /api/asr (voice search endpoint)
// Accepts audio and transcribes via OpenAI-compatible Whisper API (if configured),
// or guides the client to use native browser speech recognition.
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { audio } = body as { audio?: string };
    if (!audio) return NextResponse.json({ error: "missing audio" }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const base64 = audio.replace(/^data:audio\/\w+;base64,/, "");
        const buffer = Buffer.from(base64, "base64");
        const blob = new Blob([buffer], { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, "audio.webm");
        formData.append("model", "whisper-1");

        const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const text = (data.text || "").trim();
          if (text) return NextResponse.json({ text });
        }
      } catch (whisperErr) {
        console.warn("[/api/asr] Whisper transcription failed:", whisperErr);
      }
    }

    return NextResponse.json(
      { error: "Server speech transcription requires OPENAI_API_KEY. Please use browser speech recognition." },
      { status: 503 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "transcription failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
