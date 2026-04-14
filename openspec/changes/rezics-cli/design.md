## Context

Rezics Dispatch is a task distribution system with a hub (Elysia API server), a worker SDK (runtime-agnostic library), crawlers (book and anime metadata), and a worker dashboard (React SPA). Today the worker runs via `package/worker/src/bin.ts` — a 37-line script that reads env vars, calls `createWorker()`, and hooks signals. There's no CLI, no config file, no monitoring, and no way to serve the dashboard.

The recent `worker-sdk-and-runtime-modes` change decoupled the dashboard from the SDK, making the SDK embeddable in Tauri/browser. But it left a gap: there's no standalone host that assembles everything into a deployable unit.

The worker SDK lives in `package/worker/` and currently contains both the generic engine (`core/`) and Rezics-specific crawlers (`book-crawler/`, `anime-crawler/`). The crawlers are domain logic that doesn't belong in a reusable SDK.

The worker-dashboard (`package/worker-dashboard/`) is a Vite/React SPA that calls `/status`, `/tasks`, `/config` endpoints at `window.location.origin`. It was designed to be hosted by whatever serves it.

## Goals / Non-Goals

**Goals:**

- One `package/cli/` package that is a complete, deployable Rezics worker — run `bun run package/cli/src/main.ts start` and everything works
- Config file support (`~/.rezics/config.toml`) with env var and CLI flag overrides
- Dashboard served over HTTP from the CLI process (pre-built SPA + JSON API)
- Crawlers moved into the CLI as internal modules, keeping them modular (each crawler is a directory with source adapters) but not separate packages
- Parallel task execution works correctly — different sources don't block each other

**Non-Goals:**

- Generic/framework CLI that works for non-Rezics use cases — this is a product CLI
- TUI mode or interactive terminal dashboard — the browser dashboard is sufficient
- Dynamic plugin discovery or runtime plugin loading — crawlers are hardwired imports
- Hub management commands (project CRUD, task submission) — future work
- Daemonization or service management — use systemd/supervisor/docker externally
- `rezics stop` command — use Ctrl-C / SIGTERM; no PID file management for now

## Decisions

### 1. Package structure: new `package/cli/` with crawlers inside

The CLI is a new package at `package/cli/`. Crawlers move from `package/worker/src/{book-crawler,anime-crawler}/` into `package/cli/src/crawler/{book,anime}/`. The worker SDK (`package/worker/`) becomes a pure library with no Rezics domain code.

```
package/cli/
  src/
    main.ts                  ← entry point, arg parsing
    config.ts                ← config file + env + flag loading
    server.ts                ← Elysia: API endpoints + static dashboard
    worker.ts                ← assembles createWorker() with crawlers
    crawler/
      book/
        index.ts             ← definePlugin(...)
        parser.ts
        source/
          qidian.ts
          jjwxc.ts
          novel.ts
      anime/
        index.ts             ← definePlugin(...)
        source/
          mal.ts
          anilist.ts
```

**Why a new package instead of extending bin.ts:** The worker SDK is designed to be runtime-agnostic — no `process.on`, no `process.env`, no server. The CLI is the Rezics-specific assembly that wires these together. Putting CLI, config, server, and crawlers into `package/worker/` would undo the decoupling work.

**Why crawlers inside cli, not separate packages:** The crawlers have no consumers other than this CLI (Tauri/browser will import the SDK and wire crawlers themselves). Keeping them in-package eliminates cross-package dependency management, makes the build simpler, and means one `bun build` produces everything.

**Folder naming convention:** Singular names (`crawler/`, `source/`), matching project convention.

### 2. Arg parsing: use Bun's built-in `util.parseArgs`

No external dependency. The CLI has a small surface:

```
rezics start [--port N] [--mode http|ws] [--concurrency N] [--config PATH]
rezics status [--port N]
rezics tasks [--port N]
rezics config [--config PATH]
```

`util.parseArgs` from Node's `util` module (available in Bun) handles this. No need for yargs/commander for 4 subcommands.

**Alternative considered:** `citty` or `commander`. Rejected — adds a dependency for minimal benefit. If the CLI grows to 10+ subcommands, revisit.

### 3. Config file: TOML at `~/.rezics/config.toml`

TOML is readable and well-suited for nested config. Bun doesn't have a built-in TOML parser, so we use a lightweight dependency (`smol-toml`, ~5KB, zero deps).

```toml
[hub]
url = "https://dispatch.rezics.com"
token = "rz_..."

[worker]
mode = "http"
concurrency = 10
poll_interval = 5000
heartbeat_interval = 60000
shutdown_timeout = 30000

[dashboard]
port = 45321

[crawler.book]
rate_limit = 10
sources = ["qidian", "jjwxc"]
proxy = "http://proxy.example.com"

[crawler.anime]
sources = ["mal"]
mal_api_key = "..."
```

**Resolution order:** config file → env vars → CLI flags (last wins). Env vars use the `REZICS_` prefix (e.g., `REZICS_HUB_URL`, `REZICS_WORKER_MODE`). The existing `DISPATCH_*` env vars are also supported as aliases for backward compatibility with `bin.ts`.

**Config path resolution:** Check `--config` flag, then `REZICS_CONFIG` env var, then `~/.rezics/config.toml`, then `./rezics.toml` (project-local). First existing file wins. If none found, all values must come from env vars or flags.

**Auth token:** The `[hub].token` field is a static token string. For now this is sufficient. A `token_command` field (execute a shell command to get the token, like `op read ...`) can be added later.

### 4. Dashboard serving: Elysia serves pre-built SPA + API

The `rezics start` command starts a single Elysia server that handles both:

1. **API routes:** `GET /api/status`, `GET /api/tasks`, `GET /api/config` — return JSON from the worker's `status()`, `activeTasks()`, and config respectively. Prefixed with `/api/` to avoid clashing with SPA routes.
2. **Static files:** Everything else serves from the worker-dashboard's build output directory. A catch-all route returns `index.html` for SPA client-side routing.

The worker-dashboard's API client needs a minor update: fetch from `/api/status` instead of `/status` (to match the `/api/` prefix). This is a one-line change per endpoint.

**Build pipeline:** The worker-dashboard is built at package build time (`bun run build` in `package/worker-dashboard/`). The CLI package references its `dist/` output. At dev time, the CLI can optionally proxy to Vite's dev server for hot reload.

**Alternative considered:** Embedding the built assets as base64 strings in the CLI source. Rejected — unnecessary complexity, Bun can serve files from disk efficiently.

### 5. Per-source rate limiting for parallel execution

Currently, the book-crawler uses one shared `rateLimiter` variable for all sources. When two book tasks target different sources (qidian vs jjwxc), they unnecessarily serialize.

The fix: move rate limiting into each source adapter. Each source file (`source/qidian.ts`, `source/jjwxc.ts`, etc.) manages its own rate state. The crawler's `index.ts` dispatches to the appropriate source based on the task payload.

```
crawler/book/
  index.ts          ← routes to source, no rate limiting here
  parser.ts         ← shared parsing logic
  source/
    qidian.ts       ← owns its own rate limiter
    jjwxc.ts        ← owns its own rate limiter
    novel.ts        ← owns its own rate limiter
```

The anime-crawler already keys rate limiters by source, but the limiter state lives as a module-level `Record`. In the new structure, each source file owns its state, which is cleaner and naturally parallel.

The worker SDK's concurrency pool handles the parallelism — it runs N tasks concurrently. The per-source rate limiters only gate HTTP fetches within the same source, so tasks against different sources genuinely run in parallel.

### 6. Subcommands: `status`, `tasks`, `config` are HTTP clients

`rezics status`, `rezics tasks`, and `rezics config` simply make HTTP requests to `localhost:<port>/api/...` and pretty-print the response. They don't start a worker — they talk to an already-running one.

The `--port` flag tells them which port to query (defaults to 45321, or reads from config file). If the server isn't running, they print an error and exit.

This keeps these commands trivially simple — they're just `fetch()` + formatting. No process communication, no PID files, no IPC.

## Risks / Trade-offs

**Moving crawlers is a breaking change for anyone importing from `@rezics/dispatch-worker/book-crawler`** → Mitigation: The worker package is private (`"private": true` in package.json), so there are no external consumers. The Tauri app (separate repo) will import from the CLI package or copy the crawler code.

**TOML parser is a new dependency** → Mitigation: `smol-toml` is 5KB with zero transitive dependencies. Acceptable for config parsing.

**Dashboard build output must exist before CLI can serve it** → Mitigation: The CLI's build script runs the dashboard build first. In dev mode, the CLI can start without the dashboard and log a warning. A fallback JSON-only mode (API endpoints work, SPA returns 404) prevents hard failure.

**Config file location `~/.rezics/` might conflict with other Rezics tools** → Low risk since this is the only Rezics CLI tool. The path is configurable via `--config` and `REZICS_CONFIG`.
