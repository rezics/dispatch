## 1. Package scaffold

- [ ] 1.1 Create `package/cli/` directory with `package.json` (`@rezics/dispatch-cli`, dependencies: `@rezics/dispatch-worker`, `@rezics/dispatch-type`, `elysia`, `smol-toml`, `zod`) and `tsconfig.json`
- [ ] 1.2 Add `package/cli` to workspace members in root `package.json`
- [ ] 1.3 Create `package/cli/src/main.ts` entry point with subcommand routing (`start`, `status`, `tasks`, `config`) using `util.parseArgs`

## 2. Config system

- [ ] 2.1 Create `package/cli/src/config.ts` with TOML loading, config schema (Zod), and resolution order (file → env → flags)
- [ ] 2.2 Implement config file path resolution: `--config` flag → `REZICS_CONFIG` env → `~/.rezics/config.toml` → `./rezics.toml`
- [ ] 2.3 Implement env var overlay with `REZICS_` prefix and `DISPATCH_` legacy aliases
- [ ] 2.4 Implement CLI flag override merging
- [ ] 2.5 Add secret redaction utility for config display (token, api keys, proxy credentials → `***`)

## 3. Move crawler code

- [ ] 3.1 Create `package/cli/src/crawler/book/` — move `definePlugin`, handlers, and `parser.ts` from `package/worker/src/book-crawler/`
- [ ] 3.2 Refactor book crawler into per-source files: `source/qidian.ts`, `source/jjwxc.ts`, `source/novel.ts` — each with its own rate limiter
- [ ] 3.3 Update book crawler `index.ts` to dispatch to source adapters and remove the shared single rate limiter
- [ ] 3.4 Create `package/cli/src/crawler/anime/` — move `definePlugin`, handlers, and types from `package/worker/src/anime-crawler/`
- [ ] 3.5 Refactor anime crawler into per-source files: `source/mal.ts`, `source/anilist.ts` — each owning its own rate state
- [ ] 3.6 Remove `book-crawler/` and `anime-crawler/` directories from `package/worker/src/`
- [ ] 3.7 Remove crawler-related exports from `package/worker/src/index.ts` if any exist
- [ ] 3.8 Move crawler tests from `package/worker/test/` to `package/cli/test/` and update imports

## 4. Worker assembly

- [ ] 4.1 Create `package/cli/src/worker.ts` that imports both crawlers, calls `createWorker()` with hardwired plugin registrations, and exports a factory function that takes resolved config

## 5. Dashboard server

- [ ] 5.1 Create `package/cli/src/server.ts` with Elysia HTTP server setup
- [ ] 5.2 Implement `GET /api/status` endpoint returning worker status JSON
- [ ] 5.3 Implement `GET /api/tasks` endpoint returning active tasks JSON
- [ ] 5.4 Implement `GET /api/config` endpoint returning redacted config JSON
- [ ] 5.5 Implement static file serving from `package/worker-dashboard/dist/` with SPA fallback (return `index.html` for unmatched non-API paths)
- [ ] 5.6 Add 503 fallback response when dashboard build output is missing

## 6. Dashboard API client update

- [ ] 6.1 Update `package/worker-dashboard/src/api/client.ts` to prefix endpoints with `/api/` (`/api/status`, `/api/tasks`, `/api/config`)

## 7. CLI subcommands

- [ ] 7.1 Implement `start` command in `main.ts`: load config → create worker → start server → start worker → print banner → handle signals
- [ ] 7.2 Implement `status` command: fetch `localhost:<port>/api/status`, pretty-print result or show connection error
- [ ] 7.3 Implement `tasks` command: fetch `localhost:<port>/api/tasks`, print active task table or "No active tasks"
- [ ] 7.4 Implement `config` command: load and validate config (no worker start), print redacted config or validation errors

## 8. Cleanup and wiring

- [ ] 8.1 Remove `package/worker/src/bin.ts` (replaced by CLI)
- [ ] 8.2 Update `package/worker/package.json` to remove `bin` field if present
- [ ] 8.3 Add build script to `package/cli/package.json` that builds the worker-dashboard first, then the CLI
- [ ] 8.4 Verify `bun run package/cli/src/main.ts start` works end-to-end with a running hub
