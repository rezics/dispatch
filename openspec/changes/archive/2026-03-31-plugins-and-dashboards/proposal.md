## Why

Phases 1–6 deliver the infrastructure (types, hub, worker SDK, trust, result plugins) but no domain-specific functionality and no visual interface. Without official plugins, adopters have no working example to build from. Without dashboards, hub operators and worker operators have no way to monitor queues, inspect tasks, or view worker health. This change ships the first real-world plugins and both dashboards, making the system usable end-to-end.

## What Changes

- Create official worker plugins inside `@rezics/dispatch-worker`:
  - `book-crawler`: capabilities `book:crawl`, `book:update` — fetch pages from configurable sources (qidian, jjwxc, novel), parse book metadata, return via webhook strategy
  - `anime-crawler`: capabilities `anime:crawl`, `anime:update` — fetch from MAL/AniList, parse anime metadata
- Create `@rezics/dispatch-i18n` package with typesafe-i18n for all user-facing strings shared across dashboards
- Create `@rezics/dispatch-ui` shared component library:
  - `task-card`, `worker-badge`, `log-panel`, `queue-chart` components
- Create `@rezics/dispatch-hub-dashboard` (React + Vite):
  - Pages: Overview (queue depth, throughput chart), Workers (online table), Tasks (filterable list), Plugins (result plugin config)
  - Embedded in hub at `/_dashboard`
- Create `@rezics/dispatch-worker-dashboard` (React + Vite):
  - Pages: Status (connection, counts, uptime), Tasks (live list with progress bars), Config (read-only plugin/capability view)

## Capabilities

### New Capabilities

- `plugin-book-crawler`: Book crawling plugin — configurable sources, rate limiting, proxy support, crawl and update handlers
- `plugin-anime-crawler`: Anime crawling plugin — MAL/AniList sources, crawl and update handlers
- `i18n`: Shared internationalization layer using typesafe-i18n with English as default locale
- `ui-components`: Shared React component library for task cards, worker badges, log panels, and queue charts
- `hub-dashboard`: Hub operator dashboard — overview, workers, tasks, and plugin config pages, embedded at `/_dashboard`
- `worker-dashboard`: Worker operator dashboard — status, task list with progress, and config view pages
- `hub-dashboard-embed`: Hub serves dashboard as static files at `/_dashboard`, disableable via env var

### Modified Capabilities

(none — all new packages, no spec-level changes to existing capabilities)

## Impact

- **New packages**: `package/worker/src/book-crawler/`, `package/worker/src/anime-crawler/` (features within worker), `package/i18n/`, `package/ui/`, `package/hub-dashboard/`, `package/worker-dashboard/`
- **New dependencies**: `typesafe-i18n`, `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, charting library (e.g., `recharts` or `lightweight-charts`), `@tanstack/react-query` for data fetching
- **Modified package**: `package/hub/` — serves dashboard static files at `/_dashboard`
- **APIs consumed**: Hub dashboard uses the existing hub HTTP API (`/tasks`, `/workers`, `/projects`); worker dashboard connects to the worker's local status API
- **Build artifacts**: Dashboard packages produce static HTML/JS/CSS bundles embedded into the hub and worker binaries
