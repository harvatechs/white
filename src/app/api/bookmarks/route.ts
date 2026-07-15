// WHITE Search — /api/bookmarks (GET list, POST add, DELETE one or all)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  try {
    const rows = await db.bookmark.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const data = rows.map((r) => ({
      id: r.id,
      query: r.query,
      url: r.url,
      title: r.title,
      host: r.host,
      snippet: r.snippet,
      category: r.category,
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ bookmarks: data });
  } catch (e) {
    console.error("[/api/bookmarks] GET error", e);
    return NextResponse.json({ bookmarks: [] });
  }
}

export async function POST(req: NextRequest) {
  const sessionId = await getOrCreateSessionId();
  try {
    const body = await req.json();
    const { query, url, title, host, snippet, category } = body || {};
    if (!url) return NextResponse.json({ ok: false, error: "url required" }, { status: 400 });

    const row = await db.bookmark.upsert({
      where: { sessionId_url: { sessionId, url } },
      create: {
        sessionId,
        query: String(query ?? ""),
        url: String(url),
        title: String(title ?? ""),
        host: String(host ?? ""),
        snippet: String(snippet ?? ""),
        category: String(category ?? "web"),
      },
      update: {
        query: String(query ?? ""),
        title: String(title ?? ""),
        snippet: String(snippet ?? ""),
      },
    });
    return NextResponse.json({ ok: true, bookmark: { id: row.id, url: row.url } });
  } catch (e) {
    console.error("[/api/bookmarks] POST error", e);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = await getOrCreateSessionId();
  const sp = req.nextUrl.searchParams;
  const id = sp.get("id");
  const url = sp.get("url");
  try {
    if (id) {
      await db.bookmark.deleteMany({ where: { id, sessionId } }).catch(() => {});
    } else if (url) {
      await db.bookmark.deleteMany({ where: { sessionId, url } }).catch(() => {});
    } else {
      await db.bookmark.deleteMany({ where: { sessionId } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/bookmarks] DELETE error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
