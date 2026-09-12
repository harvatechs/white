// WHITE Search — Open & Zero-Key External APIs
// Fast, deterministic, free public APIs for instant answers and autocomplete.
// Zero API keys required. Privacy-friendly.

interface WeatherResult {
  location: string;
  temperatureC: number;
  temperatureF: number;
  condition: string;
  humidity?: number;
  windSpeedKmH?: number;
}

interface DefinitionResult {
  word: string;
  partOfSpeech?: string;
  definition: string;
  phonetic?: string;
}

// In-memory caches
const weatherCache = new Map<string, { data: WeatherResult; at: number }>();
const currencyRatesCache = new Map<string, { rates: Record<string, number>; at: number }>();
const definitionCache = new Map<string, { data: DefinitionResult; at: number }>();
const suggestionsCache = new Map<string, { list: string[]; at: number }>();

// WMO Weather Interpretation Codes (WW)
function mapWmoCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 55) return "Drizzle";
  if (code >= 61 && code <= 65) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95 && code <= 99) return "Thunderstorm";
  return "Clear";
}

/**
 * Fetch live weather for any city/location using Open-Meteo (free, keyless, open).
 */
export async function fetchOpenWeather(location: string): Promise<WeatherResult | null> {
  const normLocation = location.trim().toLowerCase();
  if (!normLocation) return null;

  const cached = weatherCache.get(normLocation);
  if (cached && Date.now() - cached.at < 1000 * 60 * 15) {
    return cached.data;
  }

  try {
    // 1. Geocoding
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      normLocation
    )}&count=1&language=en&format=json`;

    const geoCtrl = new AbortController();
    const geoTimeout = setTimeout(() => geoCtrl.abort(), 3500);

    const geoRes = await fetch(geoUrl, {
      signal: geoCtrl.signal,
      headers: { "User-Agent": "WhiteSearch/1.0" },
    }).finally(() => clearTimeout(geoTimeout));

    if (!geoRes.ok) return null;
    const geoData = await geoRes.json();
    const match = geoData.results?.[0];
    if (!match) return null;

    const { latitude, longitude, name, country } = match;

    // 2. Weather forecast
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;

    const weatherCtrl = new AbortController();
    const weatherTimeout = setTimeout(() => weatherCtrl.abort(), 3500);

    const weatherRes = await fetch(weatherUrl, {
      signal: weatherCtrl.signal,
      headers: { "User-Agent": "WhiteSearch/1.0" },
    }).finally(() => clearTimeout(weatherTimeout));

    if (!weatherRes.ok) return null;
    const wData = await weatherRes.json();
    const current = wData.current;
    if (!current) return null;

    const tempC = Math.round(current.temperature_2m * 10) / 10;
    const tempF = Math.round((tempC * 1.8 + 32) * 10) / 10;
    const condition = mapWmoCode(current.weather_code);

    const result: WeatherResult = {
      location: country ? `${name}, ${country}` : name,
      temperatureC: tempC,
      temperatureF: tempF,
      condition,
      humidity: current.relative_humidity_2m,
      windSpeedKmH: Math.round(current.wind_speed_10m),
    };

    weatherCache.set(normLocation, { data: result, at: Date.now() });
    return result;
  } catch {
    return null;
  }
}

/**
 * Convert currencies using Open Exchange Rates feed (free, keyless).
 */
export async function fetchOpenCurrency(
  amount: number,
  from: string,
  to: string
): Promise<number | null> {
  const normFrom = from.toUpperCase();
  const normTo = to.toUpperCase();
  if (normFrom === normTo) return amount;

  let rates = currencyRatesCache.get(normFrom)?.rates;
  const cachedAt = currencyRatesCache.get(normFrom)?.at ?? 0;

  if (!rates || Date.now() - cachedAt > 1000 * 60 * 60 * 6) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 4000);
      const res = await fetch(`https://open.er-api.com/v6/latest/${normFrom}`, {
        signal: ctrl.signal,
        headers: { "User-Agent": "WhiteSearch/1.0" },
      }).finally(() => clearTimeout(timeout));

      if (res.ok) {
        const data = await res.json();
        if (data.rates) {
          const freshRates = data.rates as Record<string, number>;
          rates = freshRates;
          currencyRatesCache.set(normFrom, { rates: freshRates, at: Date.now() });
        }
      }
    } catch {
      // Fallback
    }
  }

  if (rates && typeof rates[normTo] === "number") {
    return amount * rates[normTo];
  }

  return null;
}

/**
 * Fetch word definition from Free Dictionary API (free, open, keyless).
 */
export async function fetchOpenDefinition(word: string): Promise<DefinitionResult | null> {
  const cleanWord = word.trim().toLowerCase();
  if (!cleanWord || cleanWord.length > 50) return null;

  const cached = definitionCache.get(cleanWord);
  if (cached && Date.now() - cached.at < 1000 * 60 * 60 * 24) {
    return cached.data;
  }

  try {
    // 1. Try Wikipedia / Wiktionary REST Summary (ultra-fast, 99.99% reliable, no rate-limits)
    const wikiCtrl = new AbortController();
    const wikiTimeout = setTimeout(() => wikiCtrl.abort(), 3000);
    try {
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanWord)}`,
        {
          signal: wikiCtrl.signal,
          headers: { "User-Agent": "WhiteSearch/1.0" },
        }
      );
      if (wikiRes.ok) {
        const data = await wikiRes.json();
        if (data.extract) {
          const sentences = data.extract.split(/(?<=[.?!])\s+/);
          const definition = sentences[0] || data.extract;
          const result: DefinitionResult = {
            word: data.title || cleanWord,
            partOfSpeech: data.description || undefined,
            definition,
          };
          definitionCache.set(cleanWord, { data: result, at: Date.now() });
          return result;
        }
      }
    } finally {
      clearTimeout(wikiTimeout);
    }

    // 2. Fallback to Free Dictionary API
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3000);

    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`,
      {
        signal: ctrl.signal,
        headers: { "User-Agent": "WhiteSearch/1.0" },
      }
    ).finally(() => clearTimeout(timeout));

    if (!res.ok) return null;
    const entries = await res.json();
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const entry = entries[0];
    const meaning = entry.meanings?.[0];
    const defObj = meaning?.definitions?.[0];
    if (!defObj?.definition) return null;

    const result: DefinitionResult = {
      word: entry.word || cleanWord,
      partOfSpeech: meaning.partOfSpeech,
      definition: defObj.definition,
      phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
    };

    definitionCache.set(cleanWord, { data: result, at: Date.now() });
    return result;
  } catch {
    return null;
  }
}

/**
 * Fetch search suggestions from DuckDuckGo autocomplete API.
 */
export async function fetchOpenSuggestions(query: string, limit = 8): Promise<string[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const cached = suggestionsCache.get(q);
  if (cached && Date.now() - cached.at < 1000 * 60 * 5) {
    return cached.list.slice(0, limit);
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 2500);

    const res = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) return [];
    const data = await res.json();

    // DuckDuckGo returns [query, [suggestions]]
    let suggestions: string[] = [];
    if (Array.isArray(data) && Array.isArray(data[1])) {
      suggestions = data[1].map((s: string) => String(s).trim()).filter(Boolean);
    }

    suggestionsCache.set(q, { list: suggestions, at: Date.now() });
    return suggestions.slice(0, limit);
  } catch {
    return [];
  }
}
