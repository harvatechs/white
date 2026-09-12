// WHITE Search — anonymous session helper (cookie-based)
// In Next.js 16, cookies() is async and read-only from `next/headers`.
// We read (or generate) the session id, and set the cookie on the response
// in the API route that calls us.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "ws_session";

export async function getOrCreateSessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE)?.value;
  // Validate token shape to prevent header injection or corrupted cookie IDs
  if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) {
    return existing;
  }
  return `ws_${crypto.randomUUID().replace(/-/g, "")}`;
}

// Helper: attach the session cookie to a NextResponse so the browser persists it
export function setSessionCookie(res: NextResponse, sessionId: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: false, // we also read it client-side for the store mirror
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
