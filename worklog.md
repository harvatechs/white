# WHITE Search — Project Worklog

> The world's cleanest search engine. No ads. No sponsors. No tracking.
> Markov-powered. 100% open source. Of the people, by the people, for the people.

---

Task ID: 1
Agent: main (Z.ai Code)
Task: Build a complete, production-ready "WHITE Search" platform — a clean, minimal, Apple-inspired search engine with Markov chain autocomplete, multiple white themes, full customization, and an About section clarifying "WHITE = clean, not racism."

Work Log:
- Explored project scaffold (Next.js 16 + TS + Tailwind 4 + shadcn/ui + Prisma/SQLite + z-ai-web-dev-sdk).
- Invoked the `web-search` skill to understand the `z-ai-web-dev-sdk` search API (`zai.functions.invoke("web_search", { query, num, recency_days })`).
- Designed and pushed a Prisma schema with 5 models: `SearchHistory`, `SearchClick`, `MarkovNode`, `MarkovEdge`, `Preferences` (anonymous session-based preferences).
- Built `src/lib/markov.ts` — a transparent Markov chain engine (tokenize → learn → suggest) that lives in SQLite, with 20 seeded clean starter queries so the engine is useful on first run.
- Built `src/lib/search.ts` — a backend-only search wrapper around z-ai-web-dev-sdk with a 10-minute in-memory cache, result transformation (clean host, letterbox avatar, relative dates), and category-specific filtering (news gets recency filter, images/videos filtered by URL hints).
- Built `src/lib/themes.ts` — 8 white variations (Pure, Ivory, Snow, Pearl, Alabaster, Ghost, Seashell, Mint) + 5 accents (Graphite, Sage, Rose, Amber, Slate), applied at runtime via CSS custom properties.
- Built `src/lib/types.ts`, `src/lib/store.ts` (Zustand), `src/lib/session.ts` (anonymous cookie session).
- Built 5 API routes: `/api/search`, `/api/suggest` (Markov autocomplete), `/api/history` (GET + DELETE), `/api/preferences` (GET + PUT), `/api/learn` (records clicks for future relevance).
- Rewrote `globals.css` with a complete WHITE design system: hairline borders, friction-less search field, result cards, skeleton loaders, custom scrollbar, segmented controls, theme swatches, animated wordmark dot.
- Updated `layout.tsx` with WHITE branding, metadata, SVG favicon, viewport theme color.
- Built 8 UI components in `src/components/white/`: `WhiteLogo`, `SearchBox` (with Markov autocomplete dropdown, keyboard nav, arrow selection), `ResultCard` (+ `ResultList`, `ResultSkeleton`, `EmptyResults`), `SearchTabs` (Web/News/Images/Videos), `AboutDialog` (6 principles: No ads, No tracking, Markov not AI, Of the people, Open source, Friction-less — explicitly clarifies WHITE = clean, not racism), `SettingsSheet` (theme picker, accent picker, density, type size, suggestion count slider, 4 behavior toggles, clear history, reset), `Footer` (sticky, with philosophy ticker), `HistoryPanel` (recent searches chips), `Boot` (hydrates prefs + history on load, applies theme), `HomeView`, `ResultsView`.
- Built `src/app/page.tsx` as a single-route SPA with URL-synced state (`?q=...&c=...`), back/forward support, and view switching between home + results.
- Fixed a Next.js 16 async `cookies()` API issue in the session helper (made it async, set cookie on NextResponse).
- Fixed category tab change to update URL + re-run search via a parent `onCategoryChange` callback.
- Fixed duplicate history entries on tab switch (dedupe consecutive identical query+category).
- Ran `bun run lint` — clean (0 errors, 0 warnings).
- Verified end-to-end with agent-browser:
  - Home view renders WHITE logo + search box + recent searches.
  - Typing "markov chain" shows Markov suggestions dropdown.
  - Submitting search shows real results (Wikipedia, Reddit, Setosa, Wolfram…), URL becomes `?q=markov+chain&c=web`.
  - News/Images/Videos tabs switch correctly and update URL.
  - About dialog opens with all 6 principles and the "WHITE = clean" clarification.
  - Settings sheet opens with all 8 themes, 5 accents, density, type size, suggestion slider, 4 toggles.
  - Switching to Ivory theme confirmed via `getComputedStyle` → `rgb(255, 255, 240)`.
  - Back button returns to clean home view at `/`.
  - No console errors, no runtime errors.

Stage Summary:
- Production-ready WHITE Search engine is live on `http://localhost:3000/`.
- Architecture: single `/` route, URL-synced state, anonymous session, SQLite-backed Markov chain + preferences + history.
- Design: Apple/Steve-Jobs-inspired minimalism — one field, one answer, hairline borders, 8 white themes.
- Philosophy: No ads, no sponsors, no tracking, no AI (Markov only), 100% open source. About section explicitly clarifies WHITE = clean, not racism.
- All core interactions browser-verified via agent-browser.
- Lint clean. Dev server running on port 3000.

Unresolved / Next-phase priorities:
- Markov model is seeded + user-trained; could add a "popular searches" aggregate feed.
- Image/video filtering is URL-heuristic based (SDK returns web results); could be improved with a dedicated image/video source.
- Could add keyboard shortcuts (`/` to focus search, `Esc` to go home).
- Could add result bookmarking / "raise/lower" ranking controls (Kagi-inspired).
- Could add a full-screen reading mode for result previews.
- Could add export/import of preferences + history (data portability).
- Could add a "Markov inspector" view to let users see and reset the trained chain (transparency).
- Could add PWA / offline shell support.
