// WHITE Search — /api/domains (raise / lower / block per-session domain rules)
// GET    -> list rules for this session
// POST   -> upsert a rule { host, action }
// DELETE -> remove a rule (by host) or all rules
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_ACTIONS = ["raise", "lower", "block"];

export async function GET() {
  const sessionId = await getOrCreateSessionId();
  try {
    const rows = await db.domainRule.findMany({
      where: { sessionId },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({
      rules: rows.map((r) => ({ id: r.id, host: r.host, action: r.action, updatedAt: r.updatedAt.toISOString() })),
    });
  } catch (e) {
    console.error("[/api/domains] GET error", e);
    return NextResponse.json({ rules: [] });
  }
}

export async function POST(req: NextRequest) {
  const sessionId = await getOrCreateSessionId();
  try {
    const body = await req.json();
    const host = String(body.host ?? "").replace(/^www\./, "").trim();
    const action = String(body.action ?? "");
    if (!host) return NextResponse.json({ ok: false, error: "host required" }, { status: 400 });
    if (!VALID_ACTIONS.includes(action)) return NextResponse.json({ ok: false, error: "bad action" }, { status: 400 });

    const row = await db.domainRule.upsert({
      where: { sessionId_host: { sessionId, host } },
      create: { sessionId, host, action },
      update: { action },
    });
    return NextResponse.json({ ok: true, rule: { id: row.id, host: row.host, action: row.action } });
  } catch (e) {
    console.error("[/api/domains] POST error", e);
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const sessionId = await getOrCreateSessionId();
  const sp = req.nextUrl.searchParams;
  const host = sp.get("host")?.replace(/^www\./, "");
  try {
    if (host) {
      await db.domainRule.deleteMany({ where: { sessionId, host } }).catch(() => {});
    } else {
      await db.domainRule.deleteMany({ where: { sessionId } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/domains] DELETE error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
