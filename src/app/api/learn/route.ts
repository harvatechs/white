// WHITE Search — /api/learn
// Records a click on a result. Used to mark queries as "clicked" and to
// feed future relevance signals. Always returns ok — learning must never fail search.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, url, title, host, position, category } = body || {};
    if (!query || !url) return NextResponse.json({ ok: true });

    await db.searchClick.create({
      data: {
        query: String(query),
        url: String(url),
        title: String(title ?? ""),
        host: String(host ?? ""),
        position: Number(position ?? 0),
        category: String(category ?? "web"),
      },
    }).catch(() => {});

    // mark the most recent matching history entry as clicked
    const latest = await db.searchHistory.findFirst({
      where: { query: String(query) },
      orderBy: { createdAt: "desc" },
    });
    if (latest && !latest.clicked) {
      await db.searchHistory.update({ where: { id: latest.id }, data: { clicked: true } }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/learn] error", e);
    return NextResponse.json({ ok: true });
  }
}
