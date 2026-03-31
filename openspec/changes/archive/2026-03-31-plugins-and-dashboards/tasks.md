## 1. i18n Package

- [x] 1.1 Scaffold `package/i18n/` with `package.json`, `tsconfig.json`, typesafe-i18n config
- [x] 1.2 Add dependency: `typesafe-i18n`
- [x] 1.3 Create `src/en/` default locale with translation keys: `common.*` (status labels, time formatting), `hub.*` (hub-dashboard strings), `worker.*` (worker-dashboard strings)
- [x] 1.4 Run typesafe-i18n generator to produce `i18n-types.ts` and `i18n-util.ts`
- [x] 1.5 Export generated types and locale utilities from `src/index.ts`
- [x] 1.6 Add unit test: import translations, verify key access is type-safe, parameterized translations work

## 2. Shared UI Component Library

- [x] 2.1 Scaffold `package/ui/` with `package.json`, `tsconfig.json`, Vite library mode config
- [x] 2.2 Add dependencies: `react`, `react-dom`, `recharts`, `@rezics/dispatch-type`, `@rezics/dispatch-i18n`
- [x] 2.3 Implement `src/task-card/` — TaskCard component: status badge (colored), priority, progress bar, timestamps, accepts i18n labels via props
- [x] 2.4 Implement `src/worker-badge/` — WorkerBadge component: ID, mode tag, capability tags, concurrency, health indicator based on lastSeen
- [x] 2.5 Implement `src/log-panel/` — LogPanel component: scrollable log list, severity colors (info/warn/error), timestamps
- [x] 2.6 Implement `src/queue-chart/` — QueueChart component: Recharts line chart for queue depth (pending/running over time), optional throughput bar chart
- [x] 2.7 Add CSS custom properties for light/dark theme support across all components
- [x] 2.8 Export all components from `src/index.ts`
- [x] 2.9 Add Storybook or simple test page to visually verify components in both themes

## 3. Book Crawler Plugin

- [x] 3.1 Create `package/worker/src/book-crawler/index.ts` — `definePlugin()` with capabilities `['book:crawl', 'book:update']`, mode `'http'`, trust `'receipted'`
- [x] 3.2 Define Zod config schema: `rateLimit` (number, default 10), `proxy` (optional URL), `sources` (enum array, default `['qidian']`)
- [x] 3.3 Implement `onLoad` hook: initialize HTTP client with rate limiter and optional proxy
- [x] 3.4 Implement `book:crawl` handler: fetch page from `task.payload.url`, parse book metadata, report progress (10%, 80%), return webhook result
- [x] 3.5 Implement `book:update` handler: check content hash, return discard if unchanged, re-crawl if changed
- [x] 3.6 Implement `src/book-crawler/parser.ts` — book metadata parser (title, author, chapters, description)
- [x] 3.7 Define `src/book-crawler/type.ts` — BookMetadata type, source-specific parser interfaces
- [x] 3.8 Export plugin from `@rezics/dispatch-worker/book-crawler` (package.json exports field)
- [x] 3.9 Add unit tests: config validation, parser output, handler mock (mock HTTP, verify webhook result)

## 4. Anime Crawler Plugin

- [x] 4.1 Create `package/worker/src/anime-crawler/index.ts` — `definePlugin()` with capabilities `['anime:crawl', 'anime:update']`
- [x] 4.2 Define Zod config schema: `sources` (enum `['mal', 'anilist']`, default `['mal']`), `malApiKey` (optional), `anilistToken` (optional)
- [x] 4.3 Implement `onLoad` hook: initialize API clients for configured sources with per-source rate limits (MAL: 3 req/s, AniList: 90 req/min)
- [x] 4.4 Implement `anime:crawl` handler: fetch anime metadata from source, report progress, return webhook result
- [x] 4.5 Implement `anime:update` handler: check for changes, discard if unchanged
- [x] 4.6 Define `src/anime-crawler/type.ts` — AnimeMetadata type (title, episodes, status, genres, synopsis)
- [x] 4.7 Export plugin from `@rezics/dispatch-worker/anime-crawler`
- [x] 4.8 Add unit tests: config validation, per-source rate limiting, handler mock

## 5. Hub Dashboard

- [x] 5.1 Scaffold `package/hub-dashboard/` with `package.json`, `tsconfig.json`, Vite SPA config, React entry point
- [x] 5.2 Add dependencies: `react`, `react-dom`, `@tanstack/react-query`, `@elysiajs/eden`, `@rezics/dispatch-ui`, `@rezics/dispatch-i18n`, `@rezics/dispatch-type`
- [x] 5.3 Set up Eden Treaty client pointing to hub API base URL
- [x] 5.4 Implement SPA routing (React Router or TanStack Router): `/`, `/workers`, `/tasks`, `/plugins`
- [x] 5.5 Implement sidebar/top navigation component with links to all pages
- [x] 5.6 Implement Overview page: task status counts, QueueChart, worker count — data via `GET /projects/:id/stats`
- [x] 5.7 Implement Workers page: table using WorkerBadge per row — data via `GET /workers`
- [x] 5.8 Implement Tasks page: filterable paginated list using TaskCard — data via `GET /tasks` with query params
- [x] 5.9 Implement task detail view (click task row): full payload, error, progress, timestamps
- [x] 5.10 Implement Plugins page: per-project result plugin list, enable/disable toggle — data via `GET /projects` + result_plugin API
- [x] 5.11 Implement dark mode toggle: CSS variables, localStorage persistence, system preference default
- [x] 5.12 Configure TanStack Query with refetchInterval: 5s for overview, 10s for lists
- [x] 5.13 Add i18n integration: wrap app in typesafe-i18n provider, use `LL.*` for all user-facing strings
- [x] 5.14 Build and verify: `bun run build` produces static HTML/JS/CSS in `dist/`

## 6. Worker Dashboard

- [x] 6.1 Scaffold `package/worker-dashboard/` with `package.json`, `tsconfig.json`, Vite SPA config
- [x] 6.2 Add dependencies: same as hub-dashboard (minus Eden Treaty for hub, plus local API client)
- [x] 6.3 Implement local status API in worker: Elysia instance on `localhost:45321` serving `/status`, `/tasks`, `/config`
- [x] 6.4 Implement SPA routing: `/`, `/tasks`, `/config`
- [x] 6.5 Implement Status page: hub URL, mode, connection indicator, uptime, task count aggregates
- [x] 6.6 Implement Tasks page: active tasks with live progress (TaskCard), scrollable history of completed/failed
- [x] 6.7 Implement Config page: read-only plugin list (name, version, capabilities), concurrency, mode, config values with secrets redacted
- [x] 6.8 Implement navigation and dark mode (shared pattern with hub-dashboard)
- [x] 6.9 Add i18n integration using `LL.worker.*` keys
- [x] 6.10 Build and verify: `bun run build` produces static output in `dist/`

## 7. Hub Dashboard Embedding

- [x] 7.1 Add `@elysiajs/static` to hub dependencies (if not already present)
- [x] 7.2 Copy hub-dashboard `dist/` into hub package at build time (build script or prebuild step)
- [x] 7.3 Configure Elysia static plugin to serve dashboard at `/_dashboard` with SPA fallback (all sub-routes serve `index.html`)
- [x] 7.4 Gate dashboard serving behind `DISPATCH_DISABLE_DASHBOARD` env var check
- [x] 7.5 Verify API routes (`/tasks`, `/workers`, `/projects`, `/openapi`) are not shadowed by static serving
- [x] 7.6 Add integration test: start hub, verify `/_dashboard` loads, verify API routes still work

## 8. End-to-End Verification

- [x] 8.1 E2E test: start hub with embedded dashboard → navigate all 4 pages → verify data renders from live API
- [x] 8.2 E2E test: start worker with book-crawler plugin → create book:crawl tasks → verify tasks claimed and processed
- [x] 8.3 E2E test: worker-dashboard shows live task progress while book-crawler runs
- [x] 8.4 Verify dark mode toggle works across both dashboards
- [x] 8.5 Verify i18n: all strings render from translations, no hardcoded English in components
