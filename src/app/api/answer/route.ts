// WHITE Search — /api/answer (instant answers)
// Tries to compute a direct answer for queries that don't need a full web search:
//   - math expressions: "2+2", "15*8", "sqrt(144)"
//   - unit conversions: "5 km in miles", "100 f to c"
//   - time/date: "time in tokyo", "what time is it"
//   - definitions: "define serendipity" (via LLM, lightweight)
//   - currency-ish: "1 usd in eur" (static rates fallback)
// If nothing matches, returns { answer: null } so the client shows normal results.
import { NextRequest, NextResponse } from "next/server";
import { fetchOpenWeather, fetchOpenCurrency, fetchOpenDefinition } from "@/lib/open-apis";
import { searchRateLimiter, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

interface InstantAnswer {
  kind: "math" | "unit" | "time" | "definition" | "calc" | "weather" | "currency";
  title: string;
  value: string;
  detail?: string;
}

// --- Safe Math Evaluator (Deterministic AST & Recursive Descent — Zero eval/Function) ---
class SafeMathEvaluator {
  private pos = 0;
  private tokens: string[] = [];

  private tokenize(str: string): string[] | null {
    const rawTokens: string[] = [];
    let i = 0;
    const len = str.length;

    while (i < len) {
      const ch = str[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      // Numbers (integers or decimals)
      if (/\d/.test(ch) || (ch === "." && i + 1 < len && /\d/.test(str[i + 1]))) {
        let numStr = "";
        while (i < len && (/[\d.]/.test(str[i]))) {
          numStr += str[i];
          i++;
        }
        rawTokens.push(numStr);
        continue;
      }

      // Operators and parens
      if ("+-*/%^(),".includes(ch)) {
        rawTokens.push(ch);
        i++;
        continue;
      }

      // Named functions or constants (letters only)
      if (/[a-zA-Z]/.test(ch)) {
        let word = "";
        while (i < len && /[a-zA-Z]/.test(str[i])) {
          word += str[i].toLowerCase();
          i++;
        }
        const allowedWords = new Set([
          "sqrt", "sin", "cos", "tan", "abs", "round", "floor", "ceil", "log", "min", "max", "pi", "e"
        ]);
        if (!allowedWords.has(word)) return null; // Reject any unknown identifier
        rawTokens.push(word);
        continue;
      }

      // Unknown character -> reject
      return null;
    }
    return rawTokens;
  }

  private peek(): string | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private consume(expected?: string): string {
    const tok = this.tokens[this.pos++];
    if (expected && tok !== expected) {
      throw new Error(`Expected ${expected}, got ${tok}`);
    }
    return tok;
  }

  private parsePrimary(): number {
    const tok = this.peek();
    if (!tok) throw new Error("Unexpected end of expression");

    if (tok === "(") {
      this.consume("(");
      const val = this.parseExpr();
      this.consume(")");
      return val;
    }

    if (tok === "pi") {
      this.consume("pi");
      return Math.PI;
    }
    if (tok === "e") {
      this.consume("e");
      return Math.E;
    }

    // Function call: func(arg) or func(arg1, arg2)
    if (["sqrt", "sin", "cos", "tan", "abs", "round", "floor", "ceil", "log", "min", "max"].includes(tok)) {
      const funcName = this.consume();
      this.consume("(");
      const args: number[] = [this.parseExpr()];
      while (this.peek() === ",") {
        this.consume(",");
        args.push(this.parseExpr());
      }
      this.consume(")");

      switch (funcName) {
        case "sqrt": return Math.sqrt(args[0]);
        case "sin": return Math.sin(args[0]);
        case "cos": return Math.cos(args[0]);
        case "tan": return Math.tan(args[0]);
        case "abs": return Math.abs(args[0]);
        case "round": return Math.round(args[0]);
        case "floor": return Math.floor(args[0]);
        case "ceil": return Math.ceil(args[0]);
        case "log": return Math.log(args[0]);
        case "min": return Math.min(...args);
        case "max": return Math.max(...args);
        default: throw new Error("Unknown function");
      }
    }

    // Number literal
    if (/^[\d.]+$/.test(tok)) {
      this.consume();
      const n = parseFloat(tok);
      if (isNaN(n)) throw new Error("Invalid number");
      return n;
    }

    throw new Error(`Unexpected token: ${tok}`);
  }

  private parseUnary(): number {
    if (this.peek() === "-") {
      this.consume("-");
      return -this.parseUnary();
    }
    if (this.peek() === "+") {
      this.consume("+");
      return this.parseUnary();
    }
    return this.parseExponent();
  }

  private parseExponent(): number {
    let base = this.parsePrimary();
    if (this.peek() === "^") {
      this.consume("^");
      const exp = this.parseUnary();
      base = Math.pow(base, exp);
    }
    return base;
  }

  private parseMultiplicative(): number {
    let left = this.parseUnary();
    while (this.peek() === "*" || this.peek() === "/" || this.peek() === "%") {
      const op = this.consume();
      const right = this.parseUnary();
      if (op === "*") left *= right;
      else if (op === "/") {
        if (right === 0) throw new Error("Division by zero");
        left /= right;
      } else if (op === "%") {
        left %= right;
      }
    }
    return left;
  }

  private parseAdditive(): number {
    let left = this.parseMultiplicative();
    while (this.peek() === "+" || this.peek() === "-") {
      const op = this.consume();
      const right = this.parseMultiplicative();
      if (op === "+") left += right;
      else if (op === "-") left -= right;
    }
    return left;
  }

  public parseExpr(): number {
    return this.parseAdditive();
  }

  public evaluate(str: string): number | null {
    this.pos = 0;
    const tokens = this.tokenize(str);
    if (!tokens || tokens.length === 0) return null;
    this.tokens = tokens;
    try {
      const result = this.parseExpr();
      if (this.pos < this.tokens.length) return null; // Unparsed trailing tokens
      return isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }
}

function tryMath(q: string): InstantAnswer | null {
  const cleaned = q.toLowerCase().replace(/what\s+is|calculate|compute|=\s*\?|\?/g, "").trim();
  if (!cleaned || cleaned.length > 80) return null;

  // Must contain at least one operator or math function to qualify as a math query
  if (!/[+\-*/%^]|sqrt|sin|cos|tan|log|abs|round|floor|ceil|pow|min|max/.test(cleaned)) return null;

  const evaluator = new SafeMathEvaluator();
  const result = evaluator.evaluate(cleaned);

  if (result !== null) {
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
  const timeMatch = lower.match(/^(?:what(?:'s| is) the )?time(?:\s+in\s+(.+))?$/i);
  if (!timeMatch && !/^(?:what time is it|current time)$/i.test(lower)) return null;
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

// --- Definition (Free Dictionary API + LLM Cascade) ---
async function tryDefinition(q: string): Promise<InstantAnswer | null> {
  const m = q.toLowerCase().match(/^(?:define|definition of|what does .+ mean|meaning of)\s+(.+)/);
  if (!m) return null;
  const word = m[1].replace(/\?/g, "").trim();
  if (!word || word.length > 60) return null;

  // 1. Fast, keyless Open Dictionary API
  const openDef = await fetchOpenDefinition(word);
  if (openDef) {
    const title = openDef.partOfSpeech
      ? `Definition of "${openDef.word}" (${openDef.partOfSpeech})`
      : `Definition of "${openDef.word}"`;
    return {
      kind: "definition",
      title,
      value: openDef.definition,
      detail: openDef.phonetic ? `Phonetic: ${openDef.phonetic}` : undefined,
    };
  }

  return null;
}

// --- Weather (Open-Meteo API + Web Search Cascade) ---
async function tryWeather(q: string): Promise<InstantAnswer | null> {
  const lower = q.toLowerCase().trim();
  const m = lower.match(/^(?:weather|temperature|forecast)(?:\s+in\s+(.+))?(?:\s+today)?$/);
  if (!m) return null;
  const location = m[1]?.trim() || "my location";

  // 1. Fast, keyless Open-Meteo Weather API
  const openW = await fetchOpenWeather(location);
  if (openW) {
    return {
      kind: "weather",
      title: `Weather in ${openW.location}`,
      value: `${openW.temperatureC}°C (${openW.temperatureF}°F)`,
      detail: `${openW.condition}${openW.humidity ? ` · Humidity ${openW.humidity}%` : ""}${openW.windSpeedKmH ? ` · Wind ${openW.windSpeedKmH} km/h` : ""}`,
    };
  }

  return null;
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

  // 1. Fast, keyless Open Exchange Rates API
  const openRate = await fetchOpenCurrency(amount, from, to);
  if (openRate !== null && !isNaN(openRate)) {
    return {
      kind: "currency",
      title: "Currency conversion",
      value: `${openRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}`,
      detail: `${amount.toLocaleString()} ${from} = ${openRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to} · Live Exchange Rate`,
    };
  }

  return null;
}

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const rate = searchRateLimiter.check(clientIp);
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
