// WHITE Search — /api/sync
// Encrypted/Base64 Session Export & Import.
// Allows users to backup or transfer their settings, bookmarks, domain rules,
// and custom bangs across devices with zero tracking.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSessionId } from "@/lib/session";
import { previewRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rate = previewRateLimiter.check(clientIp);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.reset),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rate.reset),
        },
      }
    );
  }
  try {
    const sessionId = await getOrCreateSessionId();

    const [prefs, bookmarks, domainRules] = await Promise.all([
      db.preferences.findUnique({ where: { sessionId } }),
      db.bookmark.findMany({ where: { sessionId } }),
      db.domainRule.findMany({ where: { sessionId } }),
    ]);

    const exportPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      prefs: prefs
        ? {
            theme: prefs.theme,
            density: prefs.density,
            fontScale: prefs.fontScale,
            safeSearch: prefs.safeSearch,
            openNewTab: prefs.openNewTab,
            showFavicons: prefs.showFavicons,
            markovEnabled: prefs.markovEnabled,
            suggestionCount: prefs.suggestionCount,
            accent: prefs.accent,
            customAccent: prefs.customAccent,
            searchAlgorithm: prefs.searchAlgorithm,
            searchProvider: prefs.searchProvider,
            searxngInstance: prefs.searxngInstance,
            localFirst: prefs.localFirst,
            weightRecency: prefs.weightRecency,
            weightDiversity: prefs.weightDiversity,
            weightPersonal: prefs.weightPersonal,
            spamFilter: prefs.spamFilter,
            customBangs: (() => {
              try { return prefs.customBangs ? JSON.parse(prefs.customBangs) : []; } catch { return []; }
            })(),
            customSpamDomains: (() => {
              try { return prefs.customSpamDomains ? JSON.parse(prefs.customSpamDomains) : []; } catch { return []; }
            })(),
          }
        : null,
      bookmarks: bookmarks.map((b) => ({
        query: b.query,
        url: b.url,
        title: b.title,
        host: b.host,
        snippet: b.snippet,
        category: b.category,
      })),
      domainRules: domainRules.map((d) => ({
        host: d.host,
        action: d.action,
      })),
    };

    const token = Buffer.from(JSON.stringify(exportPayload)).toString("base64");

    return NextResponse.json({
      data: exportPayload,
      token,
    });
  } catch (e) {
    console.error("[/api/sync export error]", e);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rate = previewRateLimiter.check(clientIp);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.reset),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rate.reset),
        },
      }
    );
  }
  try {
    const body = await req.json();
    let importData = body.data;

    // Decode token if token is provided
    if (body.token) {
      try {
        const decoded = Buffer.from(body.token, "base64").toString("utf-8");
        importData = JSON.parse(decoded);
      } catch {
        return NextResponse.json({ error: "Invalid sync token format" }, { status: 400 });
      }
    }

    if (!importData || !importData.version) {
      return NextResponse.json({ error: "Invalid import payload" }, { status: 400 });
    }

    const sessionId = await getOrCreateSessionId();

    // 1. Restore Preferences
    if (importData.prefs) {
      const prefsToRestore = {
        ...importData.prefs,
        customBangs: Array.isArray(importData.prefs.customBangs)
          ? JSON.stringify(importData.prefs.customBangs)
          : (typeof importData.prefs.customBangs === "string" ? importData.prefs.customBangs : undefined),
        customSpamDomains: Array.isArray(importData.prefs.customSpamDomains)
          ? JSON.stringify(importData.prefs.customSpamDomains)
          : (typeof importData.prefs.customSpamDomains === "string" ? importData.prefs.customSpamDomains : undefined),
      };

      await db.preferences.upsert({
        where: { sessionId },
        update: {
          ...prefsToRestore,
          updatedAt: new Date(),
        },
        create: {
          sessionId,
          ...prefsToRestore,
        },
      });
    }

    // 2. Restore Bookmarks
    if (Array.isArray(importData.bookmarks)) {
      for (const b of importData.bookmarks) {
        if (!b.url || !b.title) continue;
        await db.bookmark.upsert({
          where: { sessionId_url: { sessionId, url: b.url } },
          update: {
            title: b.title,
            host: b.host || "",
            snippet: b.snippet || "",
            category: b.category || "web",
          },
          create: {
            sessionId,
            query: b.query || "",
            url: b.url,
            title: b.title,
            host: b.host || "",
            snippet: b.snippet || "",
            category: b.category || "web",
          },
        });
      }
    }

    // 3. Restore Domain Rules
    if (Array.isArray(importData.domainRules)) {
      for (const d of importData.domainRules) {
        if (!d.host || !d.action) continue;
        await db.domainRule.upsert({
          where: { sessionId_host: { sessionId, host: d.host } },
          update: { action: d.action },
          create: { sessionId, host: d.host, action: d.action },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Session data restored successfully" });
  } catch (e) {
    console.error("[/api/sync import error]", e);
    return NextResponse.json({ error: "Failed to import session data" }, { status: 500 });
  }
}
