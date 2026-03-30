## Context

Phases 1–6 deliver the hub server, worker SDK, WebSocket mode, trust verification, and result plugins. The system is functionally complete but has no domain plugins (no real-world proof of the plugin API) and no UI. This change adds the first official plugins (book-crawler, anime-crawler) as features within `@rezics/dispatch-worker`, and ships three new packages: shared UI components, hub-dashboard, and worker-dashboard. The plan also specifies typesafe-i18n for all user-facing strings.

## Goals / Non-Goals

**Goals:**

- Ship two official domain plugins that demonstrate the full plugin API (config validation, lifecycle hooks, progress reporting, multiple capabilities)
- Establish the shared i18n layer so all dashboards share translations from day one
- Deliver a shared UI component library (`dispatch-ui`) with reusable task/worker/chart components
- Ship a hub-dashboard that lets operators monitor queues, workers, and configure result plugins
- Ship a worker-dashboard that lets operators see task progress, connection status, and loaded config
- Embed the hub-dashboard as static files served by the hub at `/_dashboard`

**Non-Goals:**

- Desktop app (Tauri) — Phase 9
- Real-time WebSocket streaming to dashboards (dashboards poll the REST API; WS dashboard push is a future enhancement)
- Authentication for dashboards (hub dashboard is admin-only by deployment; worker dashboard is local)
- Mobile-responsive design (desktop-first, responsive can come later)

## Decisions

### 1. React + Vite for dashboards

**Choice**: React 19 with Vite as the build tool for both dashboards.

**Rationale**: React is the most widely known frontend framework in the TypeScript ecosystem, maximizing contributor accessibility. Vite provides fast HMR during development and optimized production builds. Both dashboards share `dispatch-ui` components.

**Alternatives considered**:
- Solid/Svelte: Smaller bundle, but smaller contributor pool. React's ecosystem (charting, tables) is unmatched.
- Next.js/Remix: SSR is unnecessary — dashboards are SPAs served as static files.

### 2. @tanstack/react-query for data fetching

**Choice**: TanStack Query for all API calls from dashboards.

**Rationale**: Provides caching, background refetching, and stale-while-revalidate out of the box. Dashboards poll the hub API at configurable intervals (default 5s for overview, 10s for lists). TanStack Query handles this cleanly without manual `setInterval` wiring.

### 3. Recharts for charts

**Choice**: Recharts for the queue-chart and throughput visualizations.

**Rationale**: Built on React and D3, Recharts is declarative and composable. The hub-dashboard needs a queue depth line chart and a throughput bar chart — both are simple Recharts use cases. Lightweight enough for embedding.

**Alternatives considered**:
- lightweight-charts: TradingView library, overkill for queue metrics.
- Chart.js + react-chartjs-2: Works but less React-idiomatic.
- Custom SVG: Too much effort for standard chart types.

### 4. typesafe-i18n as shared i18n layer

**Choice**: `typesafe-i18n` in a dedicated `@rezics/dispatch-i18n` package.

**Rationale**: Provides fully type-safe translations — typos in translation keys are caught at compile time. The generated types are shared across both dashboards via package dependency. English is the default (and initially only) locale; community translations can be added later without code changes.

### 5. Eden Treaty for dashboard → hub API communication

**Choice**: Use Elysia's Eden Treaty client in the hub-dashboard for type-safe API calls.

**Rationale**: Eden Treaty derives its types directly from the Elysia server definition, giving end-to-end type safety from hub routes to dashboard fetch calls. Eliminates manual type duplication for API responses. The worker-dashboard uses Eden Treaty against the worker's local status API (which is also Elysia-based).

**Alternatives considered**:
- Raw fetch + manual types: Works but loses the type-safety chain.
- OpenAPI codegen: Adds a build step and generated code to maintain.

### 6. Plugins as features within @rezics/dispatch-worker

**Choice**: Official plugins live as feature directories (`src/book-crawler/`, `src/anime-crawler/`) inside the worker package, not as separate npm packages.

**Rationale**: Follows the plan's architecture. Official plugins are tightly coupled to the worker SDK version. Users import them as `@rezics/dispatch-worker/book-crawler`. Community plugins are separate packages.

### 7. Dashboard embedding via Elysia static plugin

**Choice**: Hub serves the hub-dashboard build output as static files at `/_dashboard` using `@elysiajs/static`. Disableable via `DISPATCH_DISABLE_DASHBOARD=true`.

**Rationale**: Single-binary deployment — hub operators get a dashboard without a separate frontend server. Follows the pattern of Grafana, Meilisearch, and similar tools. The static files are included in the hub npm package at build time.

## Risks / Trade-offs

- **[Bundle size of embedded dashboard]** → React + Recharts adds ~200KB gzipped to the hub package. Mitigation: tree-shaking via Vite, and the dashboard is disableable.

- **[Polling vs real-time dashboards]** → Dashboards poll REST endpoints, not WebSocket streams. Mitigation: TanStack Query's configurable refetchInterval provides near-real-time feel (5s default). True WS push can be added later.

- **[Plugin source dependencies]** → book-crawler needs HTTP fetching; anime-crawler may need API keys for MAL/AniList. Mitigation: plugins declare their external dependencies in config via Zod (proxy, API keys are optional/configurable).

- **[Eden Treaty version coupling]** → Dashboard must match the hub's Elysia version for types to align. Mitigation: both are in the same monorepo with shared dependency versions.

## Open Questions

- Should the hub-dashboard support dark mode from the start? (Recommendation: yes, via CSS variables / Tailwind dark mode — low effort during initial build.)
- Should the worker-dashboard expose a local HTTP API for the Tauri desktop app to consume? (Recommendation: yes — plan it now so Tauri integration in Phase 9 is seamless.)
