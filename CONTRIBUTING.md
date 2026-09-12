# Contributing to WHITE Search

Thank you for your interest in contributing to **WHITE Search**! We welcome contributions from developers, designers, and privacy advocates from all backgrounds.

WHITE Search is built on a clear ethos: **The internet of the people, by the people, for the people.**  
Clean, fast, ad-free, and 100% open source under the [MIT License](LICENSE).

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Our Core Principles](#our-core-principles)
- [Project Architecture & Directory Structure](#project-architecture--directory-structure)
- [Development Setup](#development-setup)
- [How You Can Contribute](#how-you-can-contribute)
  - [1. Adding a New Instant Answer](#1-adding-a-new-instant-answer)
  - [2. Adding or Updating Bangs](#2-adding-or-updating-bangs)
  - [3. Adding a New Visual Theme](#3-adding-a-new-visual-theme)
  - [4. Performance & Ranking Enhancements](#4-performance--ranking-enhancements)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

This project adheres to the Contributor Covenant [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior via the issue tracker or maintainer contacts.

---

## Our Core Principles

1. **Zero Tracking & Zero Ads**: We will never accept PRs adding analytics trackers, telemetry collectors, affiliate links, sponsored results, or advertising banners.
2. **Zero Proprietary Locks**: All core features must function 100% out of the box without requiring paid or closed-source API keys. Optional integrations (like custom LLM endpoints) must support standard protocols (e.g. OpenAI-compatible `OPENAI_BASE_URL` for Ollama/vLLM/LocalAI).
3. **White Aesthetics & Polish**: The interface is minimal, calm, and uncluttered. Use CSS theme variables (`var(--ws-bg)`, `var(--ws-text)`, hairline borders) rather than hardcoded colors.
4. **Keyboard-First & Accessible**: Every action should be operable via keyboard navigation and accessible to screen readers.

---

## Project Architecture & Directory Structure

```text
white-search/
├── .github/                      # Issue & PR templates
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── prisma/                       # Prisma ORM schema & migrations
│   └── schema.prisma             # SQLite schema (Preferences, History, Bookmarks, Markov)
├── public/                       # Static public assets & PWA manifest
│   ├── manifest.json
│   ├── robots.txt
│   └── sw.js
├── src/
│   ├── app/                      # Next.js 16 App Router
│   │   ├── api/                  # Backend REST API Routes
│   │   │   ├── answer/           # Instant answers (math, unit, weather, currency, definition)
│   │   │   ├── asr/              # Voice search transcription endpoint
│   │   │   ├── bookmarks/        # Bookmark management
│   │   │   ├── domains/          # Kagi-style domain raise/lower/block rules
│   │   │   ├── export/           # Data export (JSON/CSV)
│   │   │   ├── history/          # Search history & timeline
│   │   │   ├── images/           # High-speed parallel image search
│   │   │   ├── markov/           # Markov transition graph inspector
│   │   │   ├── preferences/      # User settings & themes
│   │   │   ├── preview/          # Ad-free reading view generator
│   │   │   ├── related/          # Related search co-occurrence engine
│   │   │   ├── search/           # Main search aggregator
│   │   │   ├── stats/            # Privacy-safe session analytics
│   │   │   ├── suggest/          # Autocomplete cascade (Markov + open suggestions)
│   │   │   ├── summarize/        # Page summarization (OpenAI / Ollama / extractive)
│   │   │   └── sync/             # Encrypted session backup & import
│   │   ├── globals.css           # Design tokens, CSS variables, and themes
│   │   ├── layout.tsx            # Root layout, theme provider, toasts
│   │   └── page.tsx              # Main view orchestrator
│   ├── components/
│   │   ├── ui/                   # Minimal Radix-based UI primitives
│   │   └── white/                # Core WHITE Search components
│   │       ├── SearchBox.tsx     # Hero & sticky search input with suggestions
│   │       ├── ResultsView.tsx   # Search results, tabs, pagination
│   │       ├── ResultCard.tsx    # Individual result card with actions
│   │       ├── ReadingPane.tsx   # Distraction-free reader view slide-over
│   │       ├── SettingsSheet.tsx # Preferences, domain rules, theme picker
│   │       ├── CommandPalette.tsx# Keyboard command menu (Cmd+K)
│   │       └── VoiceSearchButton.tsx # Native Web Speech API integration
│   ├── hooks/                    # Reusable React hooks
│   └── lib/                      # Core business logic & helpers
│       ├── bangs.ts              # DuckDuckGo-style bang shortcuts
│       ├── db.ts                 # Prisma SQLite singleton (WAL mode)
│       ├── local-index.ts        # Built-in offline BM25 search engine
│       ├── markov.ts             # Markov chain n-gram learning engine
│       ├── open-apis.ts          # Keyless open API clients (Open-Meteo, Wiktionary, etc.)
│       ├── rate-limit.ts         # In-memory sliding window rate limiter
│       ├── search.ts             # Search cascading failover orchestrator
│       ├── security.ts           # SSRF validator & safe URL parser
│       ├── session.ts            # Anonymous session UUID generator
│       ├── store.ts              # Zustand global client state
│       └── themes.ts             # 11 curated White themes
├── Dockerfile                    # Multi-stage production container
├── docker-compose.yml            # One-click Docker deployment
└── LICENSE                       # MIT License
```

---

## Development Setup

### Prerequisites
- **Node.js**: v20.x or v22.x LTS (or **Bun** 1.1+)
- **Package Manager**: `pnpm` (recommended), `npm`, or `bun`
- **Git**

### Installation

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/your-username/white-search.git
   cd white-search
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   # or: npm install
   ```

3. **Initialize local environment and SQLite database**:
   ```bash
   cp .env.example .env
   pnpm db:setup
   # or: npm run db:setup
   ```

4. **Start the development server**:
   ```bash
   pnpm dev
   # or: npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How You Can Contribute

### 1. Adding a New Instant Answer
Instant answers run deterministically in `src/app/api/answer/route.ts` or via keyless open APIs in `src/lib/open-apis.ts`:
1. Check if the query matches a pattern (e.g. `time in [city]`, `crypto [symbol] to [currency]`).
2. Implement keyless fetching or offline computation.
3. Return an `InstantAnswer` object with `kind`, `title`, `value`, and `detail`.

### 2. Adding or Updating Bangs
Bangs are defined in `src/lib/bangs.ts`:
- Add a new entry to the `BUILTIN_BANGS` array:
  ```ts
  { prefix: "!docs", name: "Official Docs", urlTemplate: "https://devdocs.io/#q={{{s}}}", category: "Development" }
  ```

### 3. Adding a New Visual Theme
All themes live in `src/lib/themes.ts` and CSS variables in `src/app/globals.css`:
- Add the theme definition with background, surface, text, and hairline border colors.
- Register it in `THEMES` array in `src/lib/themes.ts`.

### 4. Performance & Ranking Enhancements
- Fine-tune BM25 local ranking parameters in `src/lib/local-index.ts`.
- Enhance the SQLite Markov transition model in `src/lib/markov.ts`.
- Expand security safeguards in `src/lib/security.ts`.

---

## Pull Request Guidelines

1. **Branch Naming**:
   - `feat/feature-name` for new features or providers.
   - `fix/bug-description` for bug fixes.
   - `perf/optimization` for performance improvements.
   - `docs/doc-update` for documentation changes.

2. **Pre-Commit Verification**:
   Ensure all checks pass cleanly with **zero warnings and zero errors**:
   ```bash
   pnpm typecheck   # TypeScript compiler check
   pnpm lint        # ESLint verification
   pnpm build       # Next.js production build verification
   ```

3. **Commit Messages**:
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat: add crypto conversion instant answer`
   - `fix: resolve mobile overflow in reading pane`
   - `perf: optimize markov transition edge query`
   - `docs: update docker deployment instructions`

---

## Reporting Issues

- Search the [GitHub Issue Tracker](https://github.com/white-search/white-search/issues) to see if your bug or feature request has already been reported.
- If not, open a new issue using our structured **Bug report** or **Feature request** template.
- Provide clear steps to reproduce, browser details, and screenshots if applicable.

---

## License

By contributing to **WHITE Search**, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
