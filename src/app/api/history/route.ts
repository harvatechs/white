import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sessionId = await getOrCreateSessionId();
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10) || 50, 200);

  try {
    const items = await db.searchHistory.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const data = items.map((i) => ({
      id: i.id,
      query: i.query,
      category: i.category as "web" | "news" | "images" | "videos",
      resultsCount: i.resultsCount,
      createdAt: i.createdAt.toISOString(),
    }));
    return NextResponse.json({ history: data });
  } catch (e) {
    console.error("[/api/history] error", e);
    return NextResponse.json({ history: [] });
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = await getOrCreateSessionId();
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  const timeframe = sp.get("timeframe"); // "hour" | "day" | "week" | "all"
  const q = sp.get("query");

  try {
    if (id) {
      await db.searchHistory.deleteMany({ where: { id, sessionId } }).catch(() => {});
    } else if (q) {
      await db.searchHistory.deleteMany({
        where: { sessionId, query: { contains: q } },
      });
    } else if (timeframe && timeframe !== "all") {
      const now = new Date();
      let threshold = new Date();
      if (timeframe === "hour") {
        threshold = new Date(now.getTime() - 1000 * 60 * 60);
      } else if (timeframe === "day") {
        threshold = new Date(now.getTime() - 1000 * 60 * 60 * 24);
      } else if (timeframe === "week") {
        threshold = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
      }

      await db.searchHistory.deleteMany({
        where: { sessionId, createdAt: { gte: threshold } },
      });
    } else {
      // Clear all history for current session only
      await db.searchHistory.deleteMany({ where: { sessionId } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/history] delete error", e);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
