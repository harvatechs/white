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

---
Task ID: 2
Agent: webDevReview cron (round 1)
Task: QA the current WHITE Search build via agent-browser, fix bugs, then add new features (keyboard shortcuts, Markov Inspector, popular searches, bookmarks, data export/import) and polish styling.

Work Log:
- Reviewed worklog.md from Task ID 1 — project was stable (lint clean, all core flows verified).
- Performed QA with agent-browser (1440x900 viewport):
  - Home view, search flow, category tabs, About dialog, Settings sheet all functional.
  - No console errors, no runtime errors.
  - Captured screenshots of home + results for VLM analysis.
- Used VLM (z-ai vision) to critically evaluate home + results page styling. Key findings:
  - RECENT SEARCHES heading was left-aligned while chips were centered (alignment tension).
  - Result card spacing was mostly good but could be more consistent.
  - Footer alignment could be cleaner.
  - Overall minimalism praised; specific CSS-level improvements suggested.
- Added Bookmark model to Prisma schema (sessionId + url unique) and pushed to DB.
- Built 4 new API routes:
  - `/api/bookmarks` (GET list, POST add, DELETE one/all) — Kagi-inspired save feature.
  - `/api/markov` (GET stats + top tokens/edges + token transitions; DELETE reset) — transparency inspector.
  - `/api/popular` (GET top queries + top clicked hosts) — "of the people" feed from anonymous usage.
  - `/api/export` + `/api/import` (GET downloads JSON; POST merges) — full data portability.
- Expanded Zustand store with: bookmarks, bookmarkUrls Set, popularQueries, popularHosts, and 3 new dialog toggles (showShortcuts, showMarkov, showBookmarks). Added addBookmark/removeBookmark/isBookmarked helpers.
- Expanded types.ts with BookmarkItem, PopularQuery, PopularHost, MarkovStats, MarkovInspectorData.
- Updated Boot component to hydrate bookmarks + popular searches in parallel with history.
- Built 5 new UI components:
  - `ShortcutsHelp.tsx` — dialog listing all keyboard shortcuts with kbd styling.
  - `MarkovInspector.tsx` — full transparency dialog: 3 stat cards, token inspector input, top starts/tokens/transitions with bar visualizations, reset button.
  - `BookmarksDialog.tsx` — saved results with re-search, open, remove actions; empty state.
  - `PopularSearches.tsx` — "Popular right now" chips + "Most-visited sources" for home view.
  - `use-keyboard-shortcuts.ts` hook — `/` focus, `Esc` home, `?` help, `g then h/s/a/b/m` vim-style prefixes.
- Updated ResultCard: replaced "More" button with a bookmark toggle (Bookmark/BookmarkCheck icons, opacity-0 → group-hover:opacity-100, aria-pressed state).
- Updated Footer: cleaner 3-section layout (brand / nav / philosophy), added Bookmarks (with badge), Markov, Shortcuts footer buttons.
- Updated HomeView: centered HistoryPanel + PopularSearches, added keyboard hint line ("Press / to focus · ? for shortcuts").
- Updated ResultsView: converted to forwardRef with focusSearch method (for `/` shortcut), added bookmarks button in header (with count badge), shortcuts button.
- Updated SettingsSheet: added Export/Import/Clear/Reset 2x2 grid in "Your data" section, with hidden file input for import.
- Updated page.tsx: wired keyboard shortcuts hook, added all 5 dialogs (About, Settings, Shortcuts, Markov, Bookmarks), ref forwarding for results view.
- Updated HistoryPanel: added `centered` prop to fix the VLM-identified alignment issue.
- Updated globals.css: added kbd styling, focus-visible outlines, density data-attr scaling, dialog shadow polish, bookmark pop animation, reduced-motion media query, hero glow utility.
- Updated themes.ts: applyTheme now accepts density + fontScale params, sets data-density/data-fontScale attrs, computes --ws-accent-rgb for rgba use.
- Fixed a stale Prisma client cache issue: the dev server's global PrismaClient singleton was created before the Bookmark model was added, so `db.bookmark` was undefined in some routes. Fixed by introducing a schema-version-keyed global cache in db.ts (`__wsPrisma` with `SCHEMA_VERSION`), then forcing a dev server restart via `touch next.config.ts` to fully invalidate Turbopack's module cache.
- Verified all features end-to-end via agent-browser:
  - Home shows centered recent searches + popular searches + most-visited sources.
  - Search returns 10 results, bookmark button toggles correctly (Save → Remove).
  - Bookmarks dialog shows saved bookmark with re-search/open/remove.
  - Markov Inspector shows 65 tokens, 46 edges, top starts/tokens/transitions with bar viz.
  - Keyboard `?` opens shortcuts help dialog.
  - Export API returns full JSON (preferences + history + bookmarks + markovStats).
  - No console errors throughout.
- VLM re-evaluation confirmed: alignment issues fixed, layout clean and cohesive, bookmark icon well-placed, no remaining visual issues.
- Ran `bun run lint` — clean (0 errors, 0 warnings).

Stage Summary:
- WHITE Search now has 5 major new features: keyboard shortcuts, Markov Inspector (transparency), popular searches feed, result bookmarking, and full data export/import.
- 4 new API routes, 5 new UI components, 1 new hook, 1 new Prisma model.
- Styling polished: centered alignment, kbd styling, focus-visible, density scaling, reduced-motion support, dialog shadows.
- All features browser-verified, VLM-confirmed visual improvements, lint clean.
- Dev server healthy on port 3000.

Unresolved / Next-phase priorities:
- `j`/`k` result navigation (reserved in shortcuts hook, not yet wired to scroll results).
- Image/video search is URL-heuristic; could integrate a dedicated media source.
- PWA / offline shell support.
- Full-screen reading mode for result previews.
- "Raise/lower" ranking controls (Kagi-inspired) beyond bookmarks.
- Theme could persist a custom accent color picker (beyond the 5 presets).
- Markov Inspector could show a visual graph of the top transitions.
- Mobile-specific refinements (bottom sheet for settings on small screens).
