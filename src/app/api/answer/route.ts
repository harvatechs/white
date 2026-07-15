// WHITE Search — /api/answer (instant answers)
// Tries to compute a direct answer for queries that don't need a full web search:
//   - math expressions: "2+2", "15*8", "sqrt(144)"
//   - unit conversions: "5 km in miles", "100 f to c"
//   - time/date: "time in tokyo", "what time is it"
//   - definitions: "define serendipity" (via LLM, lightweight)
//   - currency-ish: "1 usd in eur" (static rates fallback)
// If nothing matches, returns { answer: null } so the client shows normal results.
import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;
async function getZai() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

interface InstantAnswer {
  kind: "math" | "unit" | "time" | "definition" | "calc" | "weather" | "currency";
  title: string;
  value: string;
  detail?: string;
}

// --- Math evaluation (safe-ish: only allow numbers, operators, parens, Math funcs) ---
function tryMath(q: string): InstantAnswer | null {
  const cleaned = q.toLowerCase().replace(/what\s+is|calculate|compute|=\s*\?|\?/g, "").trim();
  // allow digits, operators, parens, decimal, spaces, and named math functions
  if (!/^[\d\s+\-*/().%^a-z]+$/i.test(cleaned)) return null;
  // must contain at least one operator or function call to be "math"
  if (!/[+\-*/%^]|sqrt|sin|cos|tan|log|abs|round|floor|ceil|pow|min|max/.test(cleaned)) return null;

  try {
    // transform ^ to **, sqrt(x) -> Math.sqrt(x), etc.
    let expr = cleaned
      .replace(/\^/g, "**")
      .replace(/\bsqrt\b/g, "Math.sqrt")
      .replace(/\bsin\b/g, "Math.sin")
      .replace(/\bcos\b/g, "Math.cos")
      .replace(/\btan\b/g, "Math.tan")
      .replace(/\blog\b/g, "Math.log")
      .replace(/\babs\b/g, "Math.abs")
      .replace(/\bround\b/g, "Math.round")
      .replace(/\bfloor\b/g, "Math.floor")
      .replace(/\bceil\b/g, "Math.ceil")
      .replace(/\bpow\b/g, "Math.pow")
      .replace(/\bmin\b/g, "Math.min")
      .replace(/\bmax\b/g, "Math.max")
      .replace(/\bpi\b/g, "Math.PI")
      .replace(/\be\b/g, "Math.E");

    const result = Function(`"use strict"; return (${expr});`)();
    if (typeof result === "number" && isFinite(result)) {
      const formatted = Number.isInteger(result)
        ? result.toLocaleString()
        : result.toLocaleString(undefined, { maximumFractionDigits: 8 });
      return {
        kind: "math",
        title: "Calculation",
        value: formatted,
        detail: `${cleaned} = ${formatted}`,
      };
    }
  } catch {
    /* not math */
  }
  return null;
}

// --- Unit conversion ---
function tryUnit(q: string): InstantAnswer | null {
  const m = q
    .toLowerCase()
    .match(/^([\d.,]+)\s*(km|mi|miles|m|meter|meters|cm|mm|ft|feet|foot|in|inch|inches|kg|lb|lbs|pound|pounds|g|oz|c|f|k|l|gal|qt|pt)\s*(?:to|in|->|→)\s*(km|mi|miles|m|meter|meters|cm|mm|ft|feet|foot|in|inch|inches|kg|lb|lbs|pound|pounds|g|oz|c|f|k|l|gal|qt|pt)\b/);
  if (!m) return null;
  const value = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(value)) return null;
  const from = m[2];
  const to = m[3];

  // conversion factors to a base unit
  const lengthToM: Record<string, number> = {
    km: 1000, m: 1, meter: 1, meters: 1, cm: 0.01, mm: 0.001,
    mi: 1609.344, miles: 1609.344, ft: 0.3048, feet: 0.3048, foot: 0.3048,
    in: 0.0254, inch: 0.0254, inches: 0.0254,
  };
  const weightToG: Record<string, number> = {
    kg: 1000, g: 1, lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592, oz: 28.3495,
  };

  // temperature
  if ((from === "c" || from === "f" || from === "k") && (to === "c" || to === "f" || to === "k")) {
    let celsius: number;
    if (from === "c") celsius = value;
    else if (from === "f") celsius = (value - 32) * (5 / 9);
    else celsius = value - 273.15;
    let result: number;
    if (to === "c") result = celsius;
    else if (to === "f") result = celsius * (9 / 5) + 32;
    else result = celsius + 273.15;
    const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    const labels: Record<string, string> = { c: "°C", f: "°F", k: "K" };
    return {
      kind: "unit",
      title: "Temperature conversion",
      value: `${fmt(result)} ${labels[to]}`,
      detail: `${fmt(value)} ${labels[from]} = ${fmt(result)} ${labels[to]}`,
    };
  }

  // length
  if (from in lengthToM && to in lengthToM) {
    const result = (value * lengthToM[from]) / lengthToM[to];
    const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return {
      kind: "unit",
      title: "Length conversion",
      value: `${fmt(result)} ${to}`,
      detail: `${fmt(value)} ${from} = ${fmt(result)} ${to}`,
    };
  }

  // weight
  if (from in weightToG && to in weightToG) {
    const result = (value * weightToG[from]) / weightToG[to];
    const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 4 });
    return {
      kind: "unit",
      title: "Weight conversion",
      value: `${fmt(result)} ${to}`,
      detail: `${fmt(value)} ${from} = ${fmt(result)} ${to}`,
    };
  }

  return null;
}

// --- Time ---
function tryTime(q: string): InstantAnswer | null {
  const lower = q.toLowerCase().trim();
  const timeMatch = lower.match(/(?:what(?:'s| is) the )?time(?:\s+in\s+(.+))?/);
  if (!timeMatch && !/what time is it|current time/.test(lower)) return null;
  const tz = timeMatch?.[1]?.trim();
  try {
    const now = new Date();
    let timeStr: string;
    let detail: string;
    if (tz) {
      // try to format in the named timezone
      timeStr = now.toLocaleTimeString("en-US", {
        timeZone: tz.match(/^[A-Za-z_]+\/[A-Za-z_]+$/) ? tz : undefined,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      detail = `Current time in ${tz}`;
    } else {
      timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
      detail = "Current local time";
    }
    return { kind: "time", title: "Current time", value: timeStr, detail };
  } catch {
    return null;
  }
}

// --- Definition (via LLM, lightweight) ---
async function tryDefinition(q: string): Promise<InstantAnswer | null> {
  const m = q.toLowerCase().match(/^(?:define|definition of|what does .+ mean|meaning of)\s+(.+)/);
  if (!m) return null;
  const word = m[1].replace(/\?/g, "").trim();
  if (!word || word.length > 60) return null;

  try {
    const zai = await getZai();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are WHITE Search's instant dictionary. Define the given word in ONE clear sentence (under 30 words). No examples, no etymology, just the definition. Be precise and honest.",
        },
        { role: "user", content: `Define: ${word}` },
      ],
      thinking: { type: "disabled" },
    });
    const definition = (completion.choices[0]?.message?.content ?? "").trim();
    if (!definition) return null;
    return {
      kind: "definition",
      title: `Definition of "${word}"`,
      value: definition,
    };
  } catch {
    return null;
  }
}

// --- Weather (via web search, parsed) ---
async function tryWeather(q: string): Promise<InstantAnswer | null> {
  const lower = q.toLowerCase().trim();
  const m = lower.match(/^(?:weather|temperature|forecast)(?:\s+in\s+(.+))?(?:\s+today)?$/);
  if (!m) return null;
  const location = m[1]?.trim() || "my location";

  try {
    const zai = await getZai();
    const results = (await zai.functions.invoke("web_search", {
      query: `weather ${location} today temperature`,
      num: 5,
    })) as { name?: string; snippet?: string; host_name?: string }[];

    // look for a snippet that contains a temperature pattern
    // Match temperature with explicit unit: "68°F", "20°C", "68 F", "20 C", "68 degrees F"
    // Require the unit to avoid matching random numbers
    const tempPattern = /(-?\d{1,3}(?:\.\d+)?)\s*(?:°|degrees?\s*)?\s*([fc])\b/i;
    const conditionPattern = /(sunny|cloudy|overcast|rain(?:y|ing)?|snow(?:y|ing)?|clear|fog(?:gy)?|wind(?:y)?|storm(?:y)?|thunderstorm|haze|mist)/i;

    for (const r of results) {
      const text = `${r.name ?? ""} ${r.snippet ?? ""}`;
      const tempMatch = text.match(tempPattern);
      const condMatch = text.match(conditionPattern);
      if (tempMatch) {
        const unitChar = tempMatch[2].toUpperCase();
        const temp = `${tempMatch[1]}°${unitChar}`;
        const condition = condMatch ? condMatch[1].charAt(0).toUpperCase() + condMatch[1].slice(1) : "";
        return {
          kind: "weather",
          title: `Weather in ${location}`,
          value: temp,
          detail: condition ? `${condition} · via ${r.host_name ?? "web"}` : `via ${r.host_name ?? "web"}`,
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

// --- Currency conversion (via web search, parsed) ---
async function tryCurrency(q: string): Promise<InstantAnswer | null> {
  const lower = q.toLowerCase().trim();
  // Match "100 usd to eur", "100 dollars in euros", etc.
  const m = lower.match(/^([\d,.]+)\s*(usd|dollars?|\$|eur|euros?|€|gbp|pounds?|£|jpy|yen|¥|inr|rupees?|₹|cny|yuan|rmb|cad|aud|chf|sgd)\s*(?:to|in|->|→)\s*(usd|dollars?|\$|eur|euros?|€|gbp|pounds?|£|jpy|yen|¥|inr|rupees?|₹|cny|yuan|rmb|cad|aud|chf|sgd)\b/);
  if (!m) return null;
  const amount = parseFloat(m[1].replace(/,/g, ""));
  if (isNaN(amount)) return null;

  // Normalize currency codes
  const normalize = (s: string): string => {
    const map: Record<string, string> = {
      usd: "USD", dollar: "USD", dollars: "USD", "$": "USD",
      eur: "EUR", euro: "EUR", euros: "EUR", "€": "EUR",
      gbp: "GBP", pound: "GBP", pounds: "GBP", "£": "GBP",
      jpy: "JPY", yen: "JPY", "¥": "JPY",
      inr: "INR", rupee: "INR", rupees: "INR", "₹": "INR",
      cny: "CNY", yuan: "CNY", rmb: "CNY",
      cad: "CAD", aud: "AUD", chf: "CHF", sgd: "SGD",
    };
    return map[s] || s.toUpperCase();
  };
  const from = normalize(m[2]);
  const to = normalize(m[3]);

  if (from === to) {
    return { kind: "currency", title: "Currency conversion", value: `${amount.toLocaleString()} ${to}`, detail: `Same currency` };
  }

  try {
    const zai = await getZai();
    const results = (await zai.functions.invoke("web_search", {
      query: `${amount} ${from} to ${to} exchange rate`,
      num: 3,
    })) as { name?: string; snippet?: string; host_name?: string }[];

    // Look for a converted amount in results (e.g., "100 USD = 91.23 EUR")
    const ratePattern = /([\d,.]+)\s*(?:EUR|USD|GBP|JPY|INR|CNY|CAD|AUD|CHF|SGD)/i;
    for (const r of results) {
      const text = `${r.name ?? ""} ${r.snippet ?? ""}`;
      const rateMatch = text.match(ratePattern);
      if (rateMatch) {
        const converted = parseFloat(rateMatch[1].replace(/,/g, ""));
        if (!isNaN(converted) && converted > 0) {
          return {
            kind: "currency",
            title: "Currency conversion",
            value: `${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}`,
            detail: `${amount.toLocaleString()} ${from} = ${converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to} · via ${r.host_name ?? "web"}`,
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ answer: null });

  try {
    // try instant resolvers first (fast, no LLM)
    const math = tryMath(q);
    if (math) return NextResponse.json({ answer: math });

    const unit = tryUnit(q);
    if (unit) return NextResponse.json({ answer: unit });

    const time = tryTime(q);
    if (time) return NextResponse.json({ answer: time });

    // weather needs a web search
    const weather = await tryWeather(q);
    if (weather) return NextResponse.json({ answer: weather });

    // currency needs a web search
    const currency = await tryCurrency(q);
    if (currency) return NextResponse.json({ answer: currency });

    // definition needs LLM — only for "define X" style queries
    const def = await tryDefinition(q);
    if (def) return NextResponse.json({ answer: def });

    return NextResponse.json({ answer: null });
  } catch (e) {
    console.error("[/api/answer] error", e);
    return NextResponse.json({ answer: null });
  }
}
