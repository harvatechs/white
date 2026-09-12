// WHITE Search — Bangs Registry & Query Parser
// Fast, client/server query routing like DuckDuckGo and Kagi.

export interface BangItem {
  prefix: string; // e.g. "w", "gh", "yt"
  name: string;   // e.g. "Wikipedia"
  category: "dev" | "knowledge" | "media" | "search" | "shopping" | "tools";
  urlTemplate: string; // e.g. "https://en.wikipedia.org/wiki/Special:Search?search={{{s}}}"
  favicon?: string;
}

export const BUILTIN_BANGS: BangItem[] = [
  // --- Development & Tech ---
  { prefix: "gh", name: "GitHub", category: "dev", urlTemplate: "https://github.com/search?q={{{s}}}", favicon: "https://github.githubassets.com/favicons/favicon.svg" },
  { prefix: "so", name: "Stack Overflow", category: "dev", urlTemplate: "https://stackoverflow.com/search?q={{{s}}}", favicon: "https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico" },
  { prefix: "npm", name: "npm", category: "dev", urlTemplate: "https://www.npmjs.com/search?q={{{s}}}", favicon: "https://static-production.npmjs.com/b0f1a8318363185cc2ea6a40ac23eeb2.png" },
  { prefix: "pypi", name: "PyPI", category: "dev", urlTemplate: "https://pypi.org/search/?q={{{s}}}", favicon: "https://pypi.org/static/images/favicon.6a7627cf.ico" },
  { prefix: "mdn", name: "MDN Web Docs", category: "dev", urlTemplate: "https://developer.mozilla.org/en-US/search?q={{{s}}}", favicon: "https://developer.mozilla.org/favicon-48x48.png" },
  { prefix: "rust", name: "Rust Docs / Crates", category: "dev", urlTemplate: "https://crates.io/search?q={{{s}}}", favicon: "https://crates.io/favicon.ico" },
  { prefix: "godoc", name: "Go Packages", category: "dev", urlTemplate: "https://pkg.go.dev/search?q={{{s}}}", favicon: "https://pkg.go.dev/favicon.ico" },
  { prefix: "crates", name: "crates.io", category: "dev", urlTemplate: "https://crates.io/search?q={{{s}}}", favicon: "https://crates.io/favicon.ico" },
  { prefix: "docker", name: "Docker Hub", category: "dev", urlTemplate: "https://hub.docker.com/search?q={{{s}}}", favicon: "https://hub.docker.com/favicon.ico" },
  { prefix: "gl", name: "GitLab", category: "dev", urlTemplate: "https://gitlab.com/search?search={{{s}}}", favicon: "https://gitlab.com/favicon.ico" },
  { prefix: "arch", name: "Arch Wiki", category: "dev", urlTemplate: "https://wiki.archlinux.org/index.php?search={{{s}}}", favicon: "https://wiki.archlinux.org/favicon.ico" },
  { prefix: "hn", name: "Hacker News", category: "dev", urlTemplate: "https://hn.algolia.com/?q={{{s}}}", favicon: "https://news.ycombinator.com/favicon.ico" },
  { prefix: "dev", name: "DEV Community", category: "dev", urlTemplate: "https://dev.to/search?q={{{s}}}", favicon: "https://dev.to/favicon.ico" },

  // --- Knowledge & Reference ---
  { prefix: "w", name: "Wikipedia (EN)", category: "knowledge", urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search={{{s}}}", favicon: "https://en.wikipedia.org/favicon.ico" },
  { prefix: "wiki", name: "Wikipedia (EN)", category: "knowledge", urlTemplate: "https://en.wikipedia.org/wiki/Special:Search?search={{{s}}}", favicon: "https://en.wikipedia.org/favicon.ico" },
  { prefix: "arxiv", name: "arXiv", category: "knowledge", urlTemplate: "https://arxiv.org/search/?query={{{s}}}&searchtype=all", favicon: "https://arxiv.org/favicon.ico" },
  { prefix: "scholar", name: "Google Scholar", category: "knowledge", urlTemplate: "https://scholar.google.com/scholar?q={{{s}}}", favicon: "https://scholar.google.com/favicon.ico" },
  { prefix: "wolfram", name: "Wolfram|Alpha", category: "knowledge", urlTemplate: "https://www.wolframalpha.com/input/?i={{{s}}}", favicon: "https://www.wolframalpha.com/favicon.ico" },
  { prefix: "wa", name: "Wolfram|Alpha", category: "knowledge", urlTemplate: "https://www.wolframalpha.com/input/?i={{{s}}}", favicon: "https://www.wolframalpha.com/favicon.ico" },
  { prefix: "gutenberg", name: "Project Gutenberg", category: "knowledge", urlTemplate: "https://www.gutenberg.org/ebooks/search/?query={{{s}}}", favicon: "https://www.gutenberg.org/favicon.ico" },
  { prefix: "archive", name: "Internet Archive", category: "knowledge", urlTemplate: "https://archive.org/search.php?query={{{s}}}", favicon: "https://archive.org/favicon.ico" },

  // --- Media & Social ---
  { prefix: "yt", name: "YouTube", category: "media", urlTemplate: "https://www.youtube.com/results?search_query={{{s}}}", favicon: "https://www.youtube.com/favicon.ico" },
  { prefix: "r", name: "Reddit", category: "media", urlTemplate: "https://www.reddit.com/search/?q={{{s}}}", favicon: "https://www.redditstatic.com/shreddit/assets/favicon/192x192.png" },
  { prefix: "x", name: "X / Twitter", category: "media", urlTemplate: "https://x.com/search?q={{{s}}}", favicon: "https://abs.twimg.com/favicons/twitter.3.ico" },
  { prefix: "twitch", name: "Twitch", category: "media", urlTemplate: "https://www.twitch.tv/search?term={{{s}}}", favicon: "https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c94346.png" },
  { prefix: "spotify", name: "Spotify", category: "media", urlTemplate: "https://open.spotify.com/search/{{{s}}}", favicon: "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png" },
  { prefix: "imdb", name: "IMDb", category: "media", urlTemplate: "https://www.imdb.com/find?q={{{s}}}", favicon: "https://m.media-amazon.com/images/G/01/imdb/images-grid/favicon.ico" },

  // --- Search Engines & Maps ---
  { prefix: "g", name: "Google", category: "search", urlTemplate: "https://www.google.com/search?q={{{s}}}", favicon: "https://www.google.com/favicon.ico" },
  { prefix: "ddg", name: "DuckDuckGo", category: "search", urlTemplate: "https://duckduckgo.com/?q={{{s}}}", favicon: "https://duckduckgo.com/favicon.ico" },
  { prefix: "b", name: "Bing", category: "search", urlTemplate: "https://www.bing.com/search?q={{{s}}}", favicon: "https://www.bing.com/favicon.ico" },
  { prefix: "kagi", name: "Kagi", category: "search", urlTemplate: "https://kagi.com/search?q={{{s}}}", favicon: "https://kagi.com/favicon.ico" },
  { prefix: "m", name: "Google Maps", category: "search", urlTemplate: "https://www.google.com/maps/search/{{{s}}}", favicon: "https://maps.gstatic.com/favicon.ico" },
  { prefix: "osm", name: "OpenStreetMap", category: "search", urlTemplate: "https://www.openstreetmap.org/search?query={{{s}}}", favicon: "https://www.openstreetmap.org/favicon.ico" },

  // --- Shopping & Tools ---
  { prefix: "a", name: "Amazon", category: "shopping", urlTemplate: "https://www.amazon.com/s?k={{{s}}}", favicon: "https://www.amazon.com/favicon.ico" },
  { prefix: "ebay", name: "eBay", category: "shopping", urlTemplate: "https://www.ebay.com/sch/i.html?_nkw={{{s}}}", favicon: "https://www.ebay.com/favicon.ico" },
  { prefix: "steam", name: "Steam Store", category: "shopping", urlTemplate: "https://store.steampowered.com/search/?term={{{s}}}", favicon: "https://store.steampowered.com/favicon.ico" },
];

export interface BangParseResult {
  hasBang: boolean;
  bang?: BangItem;
  cleanQuery: string;
  targetUrl?: string;
}

import { isSafeBangUrl } from "./security";

export function parseBang(
  rawQuery: string,
  customBangs: BangItem[] = []
): BangParseResult {
  const query = rawQuery.trim();
  if (!query) return { hasBang: false, cleanQuery: "" };

  const validCustomBangs = customBangs.filter((b) => isSafeBangUrl(b.urlTemplate));
  const allBangs = [...validCustomBangs, ...BUILTIN_BANGS];
  const bangMap = new Map<string, BangItem>();
  for (const b of allBangs) {
    bangMap.set(b.prefix.toLowerCase(), b);
  }

  // Check prefix bang: "!w quantum computing"
  const prefixMatch = query.match(/^!([a-zA-Z0-9_\-]+)(?:\s+(.*))?$/);
  if (prefixMatch) {
    const prefixKey = prefixMatch[1].toLowerCase();
    const cleanQuery = (prefixMatch[2] || "").trim();
    const bang = bangMap.get(prefixKey);
    if (bang && isSafeBangUrl(bang.urlTemplate)) {
      const targetUrl = cleanQuery
        ? bang.urlTemplate.replace(/\{\{\{s\}\}\}/g, encodeURIComponent(cleanQuery))
        : bang.urlTemplate.replace(/\{\{\{s\}\}\}/g, "").replace(/[?&][^=]+=$/, "");
      
      if (isSafeBangUrl(targetUrl)) {
        return { hasBang: true, bang, cleanQuery, targetUrl };
      }
    }
  }

  // Check suffix bang: "quantum computing !w"
  const suffixMatch = query.match(/^(.*?)\s+!([a-zA-Z0-9_\-]+)$/);
  if (suffixMatch) {
    const cleanQuery = suffixMatch[1].trim();
    const suffixKey = suffixMatch[2].toLowerCase();
    const bang = bangMap.get(suffixKey);
    if (bang && isSafeBangUrl(bang.urlTemplate)) {
      const targetUrl = cleanQuery
        ? bang.urlTemplate.replace(/\{\{\{s\}\}\}/g, encodeURIComponent(cleanQuery))
        : bang.urlTemplate.replace(/\{\{\{s\}\}\}/g, "").replace(/[?&][^=]+=$/, "");
      
      if (isSafeBangUrl(targetUrl)) {
        return { hasBang: true, bang, cleanQuery, targetUrl };
      }
    }
  }

  return { hasBang: false, cleanQuery: query };
}

export function getMatchingBangs(
  partial: string,
  customBangs: BangItem[] = [],
  limit = 8
): BangItem[] {
  if (!partial.startsWith("!")) return [];
  const queryPrefix = partial.slice(1).toLowerCase().trim();
  const allBangs = [...customBangs, ...BUILTIN_BANGS];

  if (!queryPrefix) {
    return allBangs.slice(0, limit);
  }

  return allBangs
    .filter(
      (b) =>
        b.prefix.toLowerCase().startsWith(queryPrefix) ||
        b.name.toLowerCase().includes(queryPrefix)
    )
    .slice(0, limit);
}
