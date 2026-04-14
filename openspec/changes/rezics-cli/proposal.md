## Why

Rezics currently has no standalone, deployable worker binary. The existing `bin.ts` is a minimal launcher that reads environment variables and calls `createWorker()` — it has no argument parsing, no subcommands, no config file support, and no way to monitor what it's doing without reading logs. The worker-dashboard was recently decoupled from the worker SDK (to enable Tauri/browser embedding), but now has no host process to serve it. To actually run Rezics in production — on a server, a VPS, or a personal machine — you need a proper CLI that bundles everything: worker engine, crawlers, dashboard, and management commands into a single deployable program.

## What Changes

- **Add a new `package/cli/` package** that serves as the Rezics CLI workstation — a single Bun binary entry point that assembles the worker SDK, crawlers, and dashboard into one deployable unit.
- **Move crawler code from `package/worker/` into `package/cli/`** as internal modules. The crawlers are Rezics business logic, not part of the generic worker SDK. They stay modular within the CLI (each crawler is a self-contained directory with its own source adapters) but are no longer published as part of `@rezics/dispatch-worker`. The worker SDK becomes a pure library with no Rezics-specific domain code.
- **Add a CLI command layer** with subcommands: `rezics start` (launch worker + dashboard server), `rezics status` (query running instance), `rezics tasks` (list active/completed tasks), `rezics config` (show loaded config).
- **Add a config file system** (`~/.rezics/config.toml` or project-local). Config file values are overridden by environment variables, which are overridden by CLI flags. Covers hub connection, worker mode, concurrency, crawler-specific settings.
- **Serve the worker-dashboard over HTTP** from the CLI process. The `rezics start` command starts an Elysia server that exposes the status/tasks/config API endpoints and serves the pre-built dashboard SPA as static files. The worker-dashboard package becomes a build-time dependency whose Vite output is bundled into the CLI.
- **Support parallel task execution across crawlers.** The worker SDK's concurrency pool already runs multiple tasks simultaneously. The crawlers must ensure their rate limiters are scoped per-source (not per-crawler) so that tasks targeting different sources run truly in parallel. The book-crawler's current single shared rate limiter will be refactored into per-source rate limiters.

## Capabilities

### New Capabilities

- `cli-entry`: CLI entry point with argument parsing, subcommands (`start`, `status`, `tasks`, `config`), signal handling, and startup orchestration.
- `cli-config`: Config file loading (`~/.rezics/config.toml`), environment variable overlay, CLI flag override. Covers hub, worker, dashboard, and per-crawler settings.
- `cli-dashboard-server`: Local Elysia HTTP server that serves the worker status/tasks/config API endpoints and the pre-built worker-dashboard SPA as static files.

### Modified Capabilities

- `worker-dashboard`: The dashboard SPA no longer needs its own dev server for production use — it is pre-built and served by the CLI's dashboard server. The API client base URL remains `window.location.origin`. No behavioral changes to the dashboard UI itself.
- `plugin-book-crawler`: Rate limiting changes from a single shared limiter to per-source rate limiters, enabling parallel execution of tasks targeting different sources.

## Impact

- **New package `@rezics/dispatch-cli`** (`package/cli/`): Main deliverable. Depends on `@rezics/dispatch-worker` (SDK), `@rezics/dispatch-worker-dashboard` (build output), `@rezics/dispatch-type`, and Elysia.
- **`@rezics/dispatch-worker`**: Crawler code (`book-crawler/`, `anime-crawler/`) is moved out. The package becomes a pure SDK exporting `createWorker`, `defineWorkerConfig`, `definePlugin`, and types. `bin.ts` is removed (replaced by the CLI). Existing tests for crawler logic move with the code.
- **`@rezics/dispatch-worker-dashboard`**: No code changes, but its build output is now consumed by the CLI package. May need a build script adjustment to output to a known location.
- **Root `package.json` / workspace config**: New workspace member `package/cli`. Dev scripts may be updated.
