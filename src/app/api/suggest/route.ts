// WHITE Search — /api/suggest (Markov-powered autocomplete)
import { NextRequest, NextResponse } from "next/server";
import { suggest, ensureSeed } from "@/lib/markov";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const limit = Math.min(parseInt(sp.get("limit") ?? "8", 10) || 8, 15);

  if (!q) return NextResponse.json({ suggestions: [] });

  try {
    await ensureSeed();
    // pull a few recent history hints for personalization
    const recent = await db.searchHistory.findMany({
      where: { query: { contains: q } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { query: true },
    });
    const hints = Array.from(new Set(recent.map((r) => r.query)));
    const suggestions = await suggest(q, limit, hints);
    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("[/api/suggest] error", e);
    return NextResponse.json({ suggestions: [] });
  }
}
