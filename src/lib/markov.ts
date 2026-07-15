// WHITE Search — Markov Chain engine
// A lightweight, deterministic Markov model that lives in SQLite.
// Used to power friction-less, people-powered query suggestions.
//
// Two layers:
//   1. Token transitions (MarkovEdge): from token A -> token B
//   2. Start distribution (MarkovNode.startCount): how often a token begins a query
//
// Suggestion strategy:
//   - Given a partial query, take the last complete token and predict the next.
//   - Blend with prefix matching on tokens (MarkovNode.frequency) for autocomplete.
//   - Blend with the user's own history for personalization.

import { db } from "@/lib/db";

const STOPWORDS = new Set([
  "the","a","an","of","to","in","on","for","and","or","is","are","at","by",
  "with","how","what","when","where","why","who","which","can","do","does",
]);

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

// Teach the chain from a new query
export async function learnQuery(query: string): Promise<void> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return;

  try {
    // mark start token
    await upsertNode(tokens[0], 1, 1);
    for (let i = 1; i < tokens.length; i++) {
      await upsertNode(tokens[i], 1, 0);
      await upsertEdge(tokens[i - 1], tokens[i]);
    }
    if (tokens.length === 1) {
      // single-token query already counted via upsertNode above
    }
  } catch (e) {
    // learning must never break search
    console.error("[markov] learnQuery error:", e);
  }
}

async function upsertNode(token: string, freqInc: number, startInc: number) {
  const existing = await db.markovNode.findUnique({ where: { token } });
  if (existing) {
    await db.markovNode.update({
      where: { token },
      data: {
        frequency: { increment: freqInc },
        startCount: { increment: startInc },
      },
    });
  } else {
    await db.markovNode.create({
      data: { token, frequency: freqInc, startCount: startInc },
    });
  }
}

async function upsertEdge(from: string, to: string) {
  const existing = await db.markovEdge.findUnique({
    where: { fromToken_toToken: { fromToken: from, toToken: to } },
  });
  if (existing) {
    await db.markovEdge.update({
      where: { fromToken_toToken: { fromToken: from, toToken: to } },
      data: { weight: { increment: 1 } },
    });
  } else {
    await db.markovEdge.create({ data: { fromToken: from, toToken: to, weight: 1 } });
  }
}

// Generate suggestions for a partial query.
// Returns up to `limit` suggestions, scored 0..1.
export async function suggest(
  partial: string,
  limit: number,
  historyHints: string[] = []
): Promise<{ text: string; score: number; source: "markov" | "history" | "popular" }[]> {
  const trimmed = partial.trim();
  if (!trimmed) return [];

  const tokens = tokenize(trimmed);
  const lastToken = tokens[tokens.length - 1] ?? "";
  const prefix = trimmed;

  const out: Map<string, { text: string; score: number; source: "markov" | "history" | "popular" }> = new Map();

  // 1) Personal history first — strongest signal for the individual
  for (const h of historyHints) {
    if (h.toLowerCase().startsWith(prefix.toLowerCase()) && h.toLowerCase() !== trimmed.toLowerCase()) {
      const existing = out.get(h);
      const score = 0.95;
      if (!existing || existing.score < score) {
        out.set(h, { text: h, score, source: "history" });
      }
    }
  }

  // 2) Markov: complete the current token, then optionally predict the next token
  if (lastToken) {
    // nodes that start with the last token (autocomplete the current word)
    const tokenMatches = await db.markovNode.findMany({
      where: { token: { startsWith: lastToken } },
      orderBy: { frequency: "desc" },
      take: limit * 2,
    });

    for (const node of tokenMatches) {
      if (node.token === lastToken) continue;
      const completed = tokens.slice(0, -1).concat(node.token).join(" ");
      const score = Math.min(0.85, 0.3 + node.frequency / 50);
      const existing = out.get(completed);
      if (!existing || existing.score < score) {
        out.set(completed, { text: completed, score, source: "markov" });
      }
    }

    // predict next token from the last complete token
    const edges = await db.markovEdge.findMany({
      where: { fromToken: lastToken },
      orderBy: { weight: "desc" },
      take: limit,
    });

    const maxWeight = edges[0]?.weight ?? 1;
    for (const edge of edges) {
      const completed = [...tokens, edge.toToken].join(" ");
      const score = Math.min(0.8, 0.2 + (edge.weight / maxWeight) * 0.5);
      const existing = out.get(completed);
      if (!existing || existing.score < score) {
        out.set(completed, { text: completed, score, source: "markov" });
      }
    }
  }

  // 3) Popular start tokens when the query is just beginning
  if (tokens.length <= 1) {
    const starts = await db.markovNode.findMany({
      where: { token: { startsWith: prefix.toLowerCase() } },
      orderBy: { startCount: "desc" },
      take: limit,
    });
    const maxStart = starts[0]?.startCount ?? 1;
    for (const node of starts) {
      if (node.token === prefix.toLowerCase()) continue;
      const score = Math.min(0.75, 0.25 + (node.startCount / maxStart) * 0.4);
      const existing = out.get(node.token);
      if (!existing || existing.score < score) {
        out.set(node.token, { text: node.token, score, source: "popular" });
      }
    }
  }

  return Array.from(out.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Seed the chain with a handful of clean, common starter queries so the
// engine is useful on first run (people-powered by the people who built it).
const SEED_QUERIES = [
  "open source search engine",
  "clean minimal design",
  "how does a markov chain work",
  "best free software",
  "privacy focused tools",
  "linux desktop environment",
  "self hosted applications",
  "public domain books",
  "creative commons music",
  "wikipedia",
  "react server components",
  "tailwind css v4",
  "prisma orm tutorial",
  "bun javascript runtime",
  "next js 16",
  "duckduckgo vs google",
  "kagi search review",
  "frictionless design principles",
  "steve jobs design philosophy",
  "typography for the web",
];

let seeded = false;
export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  const count = await db.markovNode.count();
  if (count > 5) {
    seeded = true;
    return;
  }
  for (const q of SEED_QUERIES) {
    await learnQuery(q);
  }
  seeded = true;
}
