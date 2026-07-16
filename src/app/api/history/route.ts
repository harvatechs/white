// WHITE Search — /api/history
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10) || 50, 200);

  try {
    const items = await db.searchHistory.findMany({
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
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  try {
    if (id) {
      await db.searchHistory.delete({ where: { id } }).catch(() => {});
    } else {
      await db.searchHistory.deleteMany({});
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/history] delete error", e);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
