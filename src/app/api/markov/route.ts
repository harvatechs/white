// WHITE Search — /api/markov (transparency inspector)
// GET: returns chain stats + top tokens + top transitions
// DELETE: resets the entire chain (keeps seeds so the engine stays useful)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const token = sp.get("token"); // optional: get transitions for a specific token
  try {
    const [nodeCount, edgeCount, totalFrequency] = await Promise.all([
      db.markovNode.count(),
      db.markovEdge.count(),
      db.markovNode.aggregate({ _sum: { frequency: true } }),
    ]);

    const topStarts = await db.markovNode.findMany({
      orderBy: { startCount: "desc" },
      take: 15,
      select: { token: true, startCount: true, frequency: true },
    });

    const topTokens = await db.markovNode.findMany({
      orderBy: { frequency: "desc" },
      take: 15,
      select: { token: true, frequency: true, startCount: true },
    });

    const topEdges = await db.markovEdge.findMany({
      orderBy: { weight: "desc" },
      take: 15,
      select: { fromToken: true, toToken: true, weight: true },
    });

    let tokenTransitions: { toToken: string; weight: number }[] = [];
    if (token) {
      tokenTransitions = await db.markovEdge.findMany({
        where: { fromToken: token.toLowerCase() },
        orderBy: { weight: "desc" },
        take: 20,
        select: { toToken: true, weight: true },
      });
    }

    return NextResponse.json({
      stats: {
        nodes: nodeCount,
        edges: edgeCount,
        totalFrequency: totalFrequency._sum.frequency ?? 0,
      },
      topStarts,
      topTokens,
      topEdges,
      tokenTransitions,
    });
  } catch (e) {
    console.error("[/api/markov] GET error", e);
    return NextResponse.json({ stats: { nodes: 0, edges: 0, totalFrequency: 0 }, topStarts: [], topTokens: [], topEdges: [], tokenTransitions: [] });
  }
}

export async function DELETE() {
  try {
    await db.markovEdge.deleteMany({});
    await db.markovNode.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[/api/markov] DELETE error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
