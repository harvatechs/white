// WHITE Search — Embedded Local BM25 Knowledge Engine
// 100% Client-First & Offline Ready — Zero API Rate Limits

import type { SearchSource } from "./types";

export interface LocalKnowledgeItem {
  id: string;
  name: string;
  url: string;
  snippet: string;
  cleanHost: string;
  category: "web" | "news" | "images" | "videos";
  tags: string[];
  date?: string;
  content?: string;
}

export const KNOWLEDGE_PACK: LocalKnowledgeItem[] = [
  // --- WEB DEVELOPMENT & FRAMEWORKS ---
  {
    id: "nextjs",
    name: "Next.js by Vercel — The React Framework for the Web",
    url: "https://nextjs.org",
    cleanHost: "nextjs.org",
    category: "web",
    tags: ["nextjs", "react", "framework", "javascript", "typescript", "vercel", "ssr", "fullstack"],
    snippet: "Used by some of the world's largest companies, Next.js enables you to create high-quality web applications with the power of React components.",
    content: "Next.js React Framework Vercel server-side rendering static site generation app router server actions frontend web development performance optimization"
  },
  {
    id: "react",
    name: "React – A JavaScript library for building user interfaces",
    url: "https://react.dev",
    cleanHost: "react.dev",
    category: "web",
    tags: ["react", "javascript", "ui", "library", "frontend", "hooks", "jsx", "meta"],
    snippet: "React lets you build user interfaces out of individual pieces called components. Create your own React components like Thumbnail, LikeButton, and Video.",
    content: "React library user interfaces components hooks useState useEffect state management virtual dom jsx declarative component-based"
  },
  {
    id: "typescript",
    name: "TypeScript: JavaScript With Syntax For Types",
    url: "https://www.typescriptlang.org",
    cleanHost: "typescriptlang.org",
    category: "web",
    tags: ["typescript", "javascript", "types", "compiler", "programming", "microsoft"],
    snippet: "TypeScript extends JavaScript by adding types to the language. TypeScript speeds up your development experience by catching errors early.",
    content: "TypeScript strongly typed programming language compiles to JavaScript interfaces type safety static checking auto-completion"
  },
  {
    id: "tailwind",
    name: "Tailwind CSS - Rapidly build modern websites without ever leaving your HTML",
    url: "https://tailwindcss.com",
    cleanHost: "tailwindcss.com",
    category: "web",
    tags: ["tailwind", "css", "styling", "frontend", "utility-first", "design"],
    snippet: "A utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90 that can be composed to build any design, directly in your markup.",
    content: "Tailwind CSS utility-first framework responsive design responsive flexbox grid typography dark mode custom theme animation"
  },
  {
    id: "python",
    name: "Welcome to Python.org",
    url: "https://www.python.org",
    cleanHost: "python.org",
    category: "web",
    tags: ["python", "programming", "backend", "data-science", "ai", "machine-learning"],
    snippet: "Python is a programming language that lets you work quickly and integrate systems more effectively. Powerful, fast, plays well with others.",
    content: "Python programming language object-oriented data science machine learning web development django flask pandas numpy syntax readability"
  },
  {
    id: "nodejs",
    name: "Node.js — Run JavaScript Everywhere",
    url: "https://nodejs.org",
    cleanHost: "nodejs.org",
    category: "web",
    tags: ["node", "nodejs", "javascript", "backend", "runtime", "npm", "server"],
    snippet: "Node.js is an open-source, cross-platform JavaScript runtime environment that executes JavaScript code outside a web browser.",
    content: "Node.js JavaScript runtime asynchronous event-driven V8 engine backend server npm packages REST API Express"
  },
  {
    id: "rust",
    name: "Rust Programming Language",
    url: "https://www.rust-lang.org",
    cleanHost: "rust-lang.org",
    category: "web",
    tags: ["rust", "programming", "systems", "memory-safe", "performance"],
    snippet: "A language empowering everyone to build reliable and efficient software. Performance, reliability, and productivity.",
    content: "Rust systems programming memory safety without garbage collection zero-cost abstractions concurrency cargo webassembly"
  },
  {
    id: "prisma",
    name: "Prisma | Next-generation ORM for Node.js & TypeScript",
    url: "https://www.prisma.io",
    cleanHost: "prisma.io",
    category: "web",
    tags: ["prisma", "orm", "database", "typescript", "sqlite", "postgres", "sql"],
    snippet: "Prisma unlocks a new level of developer experience when working with databases thanks to its intuitive data model, automated migrations, type-safety & auto-completion.",
    content: "Prisma ORM database schema migration type-safe query builder SQLite PostgreSQL MySQL query engine client"
  },
  {
    id: "sqlite",
    name: "SQLite Home Page",
    url: "https://www.sqlite.org",
    cleanHost: "sqlite.org",
    category: "web",
    tags: ["sqlite", "database", "sql", "embedded", "local-first", "storage"],
    snippet: "SQLite is a C-language library that implements a small, fast, self-contained, high-reliability, full-featured, SQL database engine.",
    content: "SQLite embedded SQL database serverless zero-configuration transactional ACIS local storage open-source file-based"
  },

  // --- OPEN SOURCE & SEARCH ENGINES ---
  {
    id: "searxng",
    name: "SearXNG - A privacy-respecting, hackable metasearch engine",
    url: "https://docs.searxng.org",
    cleanHost: "searxng.org",
    category: "web",
    tags: ["searxng", "search", "open-source", "privacy", "metasearch", "federated"],
    snippet: "SearXNG is a free internet metasearch engine which aggregates results from more than 70 search services. Users are neither tracked nor profiled.",
    content: "SearXNG metasearch engine privacy open source self-hosted query aggregation zero tracking customizable python"
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo — Privacy, simplified.",
    url: "https://duckduckgo.com",
    cleanHost: "duckduckgo.com",
    category: "web",
    tags: ["duckduckgo", "ddg", "search", "privacy", "tracker-blocking"],
    snippet: "The Internet privacy company that empowers you to seamlessly take control of your personal information online, without any trade-offs.",
    content: "DuckDuckGo private search engine no tracking bang redirects privacy protection search results"
  },
  {
    id: "white-search",
    name: "WHITE Search — Local-First Serverless Search Engine",
    url: "https://github.com/white-search",
    cleanHost: "github.com",
    category: "web",
    tags: ["white", "white-search", "search", "local-first", "serverless", "markov"],
    snippet: "A minimal, lightning-fast, local-first search engine built with Next.js, Prisma, and transparent Markov autocomplete.",
    content: "WHITE Search local-first serverless search engine open source no rate limits markov chain instant answers local indexing"
  },

  // --- SCIENCE, AI & TECHNOLOGY ---
  {
    id: "ai",
    name: "Artificial Intelligence — Overview & Frontiers",
    url: "https://en.wikipedia.org/wiki/Artificial_intelligence",
    cleanHost: "wikipedia.org",
    category: "web",
    tags: ["ai", "artificial-intelligence", "machine-learning", "deep-learning", "neural-networks", "llm"],
    snippet: "Artificial intelligence is intelligence demonstrated by machines, as opposed to intelligence displayed by non-human animals and humans.",
    content: "Artificial Intelligence machine learning deep learning neural networks generative AI LLM transformers natural language processing computer vision robotics"
  },
  {
    id: "quantum",
    name: "Quantum Computing — Wikipedia",
    url: "https://en.wikipedia.org/wiki/Quantum_computing",
    cleanHost: "wikipedia.org",
    category: "web",
    tags: ["quantum", "quantum-computing", "physics", "qubits", "science"],
    snippet: "Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers.",
    content: "Quantum computing qubits superposition entanglement quantum speedup hardware algorithms cryptography quantum mechanics physics"
  },
  {
    id: "space",
    name: "NASA — National Aeronautics and Space Administration",
    url: "https://www.nasa.gov",
    cleanHost: "nasa.gov",
    category: "web",
    tags: ["nasa", "space", "astronomy", "science", "planets", "universe", "mars"],
    snippet: "NASA explores the unknown in air and space, innovates for the benefit of humanity, and inspires the world through discovery.",
    content: "NASA space exploration astronomy james webb telescope mars rover universe earth science rockets astrophysics discoveries"
  },

  // --- POPULAR COMMUNITY & DEV PLACES ---
  {
    id: "github",
    name: "GitHub: Let's build from here",
    url: "https://github.com",
    cleanHost: "github.com",
    category: "web",
    tags: ["github", "git", "code", "repository", "open-source", "collaboration"],
    snippet: "GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories.",
    content: "GitHub git version control repository code open source pull requests issues workflow CI CD developer community"
  },
  {
    id: "stackoverflow",
    name: "Stack Overflow - Where Developers Learn, Share, & Build Careers",
    url: "https://stackoverflow.com",
    cleanHost: "stackoverflow.com",
    category: "web",
    tags: ["stackoverflow", "qa", "developer", "coding", "debugging", "programming"],
    snippet: "Stack Overflow is the largest, most trusted online community for developers to learn, share their programming knowledge, and build their careers.",
    content: "Stack Overflow programming questions answers debugging code errors algorithms software development community"
  },
  {
    id: "mdn",
    name: "MDN Web Docs — Web technology for developers",
    url: "https://developer.mozilla.org",
    cleanHost: "developer.mozilla.org",
    category: "web",
    tags: ["mdn", "javascript", "html", "css", "web-docs", "mozilla", "reference"],
    snippet: "The MDN Web Docs site provides information about Open Web technologies including HTML, CSS, and APIs for both Web sites and progressive Web apps.",
    content: "MDN Web Docs Mozilla JavaScript reference HTML DOM CSS API web standards tutorials guide specs"
  },
  {
    id: "hackernews",
    name: "Hacker News",
    url: "https://news.ycombinator.com",
    cleanHost: "news.ycombinator.com",
    category: "news",
    tags: ["news", "hackernews", "ycombinator", "tech", "startups", "programming"],
    snippet: "Hacker News is a social news website focusing on computer science and entrepreneurship, run by the startup incubator Y Combinator.",
    content: "Hacker News tech news startups Y Combinator computer science programming discussions show HN"
  },
];

/**
 * High-speed BM25 / TF-IDF Search Engine
 */
export function searchLocalIndex(
  query: string,
  category: "web" | "news" | "images" | "videos" = "web",
  limit: number = 15
): SearchSource[] {
  const qClean = query.trim().toLowerCase();
  if (!qClean) return [];

  const terms = qClean.split(/\s+/).filter((t) => t.length > 0);

  const scored = KNOWLEDGE_PACK.map((item) => {
    let score = 0;
    const title = item.name.toLowerCase();
    const snippet = item.snippet.toLowerCase();
    const content = (item.content || "").toLowerCase();
    const host = item.cleanHost.toLowerCase();

    // 1. Exact query match in title
    if (title.includes(qClean)) score += 50;

    // 2. Query matches host or tag
    if (host.includes(qClean)) score += 30;
    for (const tag of item.tags) {
      if (tag === qClean) score += 40;
      else if (tag.includes(qClean)) score += 20;
    }

    // 3. Per-term scoring (TF-IDF approximation)
    for (const term of terms) {
      if (term.length < 2) continue;

      if (title.includes(term)) score += 15;
      if (snippet.includes(term)) score += 8;
      if (content.includes(term)) score += 4;
    }

    // Category match boost
    if (item.category === category) score += 10;

    return { item, score };
  });

  // Filter items with score > 0 and sort by score descending
  const matched = scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return matched.map((m, i) => ({
    url: m.item.url,
    name: m.item.name,
    snippet: m.item.snippet,
    host_name: m.item.cleanHost,
    rank: i + 1,
    date: m.item.date ?? "Local Engine",
    favicon: `https://external-content.duckduckgo.com/ip3/${m.item.cleanHost}.ico`,
  }));
}
