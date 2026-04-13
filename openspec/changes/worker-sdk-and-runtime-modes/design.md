## Context

The dispatch worker SDK (`@rezics/dispatch-worker`) is currently a standalone runtime that assumes it owns the process. It calls `process.on('SIGINT')` and `process.exit()` for shutdown, bundles an Elysia HTTP server for the worker dashboard, and uses `process.env.DEBUG` for logging. These assumptions prevent the SDK from being embedded as a library inside other applications.

Rezics plans to distribute the worker in three forms: a standalone Bun process, embedded inside a Tauri desktop app, and embedded inside a browser extension. All three must use the same SDK and plugin system. The browser extension uses HTTP-only mode (no WebSocket), while Bun and Tauri can use either HTTP or WebSocket.

The current per-task lease renewal model (`POST /tasks/lease/renew` with specific task IDs) is inefficient when a worker holds hundreds of tasks. A worker-level heartbeat that covers all claimed tasks in one request is a better fit for batch-heavy workloads.

Additionally, there is no mechanism to prevent a worker that heartbeats forever but never completes work from holding tasks indefinitely. A per-project maximum hold time provides a safety net.

## Goals / Non-Goals

**Goals:**

- Refactor the worker SDK to be a pure library with no process, server, or runtime assumptions
- Add a single-run mode for bounded-lifetime environments (browser extensions, cron jobs)
- Add worker-level heartbeat for HTTP mode (one request covers all claimed tasks)
- Add two-tier timeout: short-term (missed heartbeat) + long-term (max hold time, configurable per project)
- Decouple the worker dashboard from the SDK package
- Ensure the SDK works in Bun, Tauri WebView, and browser extension service workers without conditional builds

**Non-Goals:**

- Browser-compatible WebSocket mode (browser extensions use HTTP mode only)
- Rewriting the WebSocket mode (it continues to work as-is in Bun/Tauri)
- Building the Tauri shell or browser extension (those are separate Rezics products that consume this SDK)
- Changing the hub result plugin system
- Multi-hub worker support

## Decisions

### 1. Remove process lifecycle from the SDK core

**Choice**: `createWorker()` no longer registers signal handlers or calls `process.exit()`. It exposes `start()` and `stop()` methods. The consuming application decides how to call them.

**Rationale**: A library cannot own the process. The standalone Bun entry point wraps the SDK with signal handlers; Tauri and browser extensions handle lifecycle their own way. This is the minimal change that makes the SDK embeddable.

**Alternatives considered**:
- Optional `handleSignals: true` config flag: Adds complexity for a niche case. The standalone entry point is 5 lines of code — no need to parameterize it.

### 2. Remove the bundled Elysia dashboard server

**Choice**: The worker SDK no longer starts an HTTP server or depends on Elysia. Instead, the worker exposes status data via methods (`status()`, `activeTasks()`, etc.) that any host application can query programmatically.

**Rationale**: An HTTP server on port 45321 doesn't make sense inside a browser extension. The dashboard package (`@rezics/dispatch-worker-dashboard`) can still exist as a separate embeddable React component — it just won't be wired up by the SDK. The consuming app decides if and how to surface worker status.

**Alternatives considered**:
- Keep Elysia as optional dependency: Still pollutes the dependency tree for environments that can't use it.
- Event emitter for status updates: More complex and doesn't match the request/response pattern the dashboard already uses. Simple getter methods are sufficient.

### 3. Single-run mode alongside continuous mode

**Choice**: Add `mode: 'single-run'` to worker config. Single-run mode claims a batch, processes tasks with heartbeat maintenance, and resolves a promise when either: all claimed tasks are processed, or the configured `timeout` is reached.

**Rationale**: Browser extension service workers and cron jobs have bounded lifetimes. They need to claim work, do as much as possible, and exit cleanly. The host application controls when to start a run (e.g., `chrome.alarms`, cron schedule).

**Config shape**:
```typescript
defineWorkerConfig({
  mode: 'single-run',
  timeout: 120_000,        // max run duration in ms
  claimCount: 100,         // tasks to claim per run
  heartbeatInterval: 60_000,
  ...
})
```

**Lifecycle**:
1. `worker.start()` → claim `claimCount` tasks in one request
2. Start heartbeat timer (HTTP `POST /workers/heartbeat`)
3. Process tasks concurrently (up to `concurrency`)
4. Submit results to main server in batches as they complete
5. On timeout or all tasks done → stop heartbeat, resolve promise
6. `worker.stop()` → cancel any in-flight processing, stop heartbeat

**Alternatives considered**:
- Expose `claimAndProcess()` as a one-shot method instead of a mode: Doesn't handle heartbeat lifecycle cleanly. The heartbeat timer needs to run throughout processing, which requires state management — i.e., a mode.

### 4. Worker-level heartbeat for HTTP mode

**Choice**: Replace per-task `POST /tasks/lease/renew` with a worker-level `POST /workers/heartbeat`. The hub extends leases for all tasks currently claimed by that worker in one operation.

**Rationale**: When holding 1000 tasks, one heartbeat request is dramatically more efficient than batched per-task renewals. The heartbeat also serves as a liveness signal: if the hub stops receiving heartbeats, it knows the worker is dead.

**Protocol**:
- Worker sends: `POST /workers/heartbeat { workerId }` at configurable interval (default 60s)
- Hub responds: `200 OK { extended: <count> }` and sets `leaseExpiresAt = NOW() + grace_period` for all tasks owned by that worker
- Grace period: `heartbeatInterval * 3` (e.g., 60s heartbeat → 180s grace). If three heartbeats are missed, the worker is considered dead and its tasks are reclaimed by the reaper.

**WebSocket mode**: No change. The WS connection itself serves as the liveness signal (existing heartbeat messages every 15s). Max hold time still applies.

**Alternatives considered**:
- Keep per-task renewal alongside heartbeat: Unnecessary complexity. The worker-level heartbeat subsumes per-task renewal entirely for HTTP mode.

### 5. Two-tier timeout with per-project max hold time

**Choice**: Add `maxTaskHoldTime` (integer, seconds, nullable) to the `Project` model. When tasks are claimed, the hub sets `maxHoldExpiresAt = NOW() + project.maxTaskHoldTime` on each task. The reaper reclaims tasks where `maxHoldExpiresAt < NOW()` regardless of heartbeat status. `maxTaskHoldTime` is nullable — when null, there is no max hold limit.

**Rationale**: Without this, a buggy worker that heartbeats forever can hold tasks indefinitely. The max hold time is a safety net that should be set long (e.g., 1 hour, 4 hours) based on the project's expected processing profile. Making it per-project allows crawl-heavy projects to set longer limits than lightweight ones.

**Database changes**:
- `Project` table: add `max_task_hold_time` column (integer, nullable, seconds)
- `Task` table: add `max_hold_expires_at` column (DateTime, nullable)

**Reaper logic**:
```
-- Existing: reclaim on missed heartbeat (lease expired)
WHERE status = 'running' AND lease_expires_at < NOW()

-- New: reclaim on max hold exceeded
OR (status = 'running' AND max_hold_expires_at IS NOT NULL AND max_hold_expires_at < NOW())
```

**Alternatives considered**:
- Global max hold time (not per-project): Too inflexible. A book crawl project processing 1000 pages needs more time than a metadata lookup project.
- Max hold time on the worker side only: The hub can't enforce it. A misbehaving worker could ignore its own timeout.

### 6. Worker SDK packaging: library + standalone entry point

**Choice**: The `@rezics/dispatch-worker` package exports the SDK as its main entry point. The standalone Bun runner is a separate `bin` entry that wraps the SDK with process lifecycle. The Rezics plugins remain as subpath exports.

**Package structure**:
```
@rezics/dispatch-worker
  ./              → SDK (createWorker, definePlugin, types)
  ./book-crawler  → book crawler plugin
  ./anime-crawler → anime crawler plugin
  ./bin           → standalone Bun entry point (reads env, handles SIGINT)
```

**Rationale**: Consumers that embed the worker import from `.` and get a clean library. The standalone entry point is just a thin wrapper:
```typescript
import { createWorker, defineWorkerConfig } from '@rezics/dispatch-worker'
const worker = createWorker(config)
process.on('SIGINT', () => worker.stop())
await worker.start()
```

The Tauri app and browser extension import the same SDK and handle lifecycle their own way.

**Alternatives considered**:
- Separate `@rezics/dispatch-worker-core` and `@rezics/dispatch-worker` packages: Splits the API surface unnecessarily. One package with separate entry points is simpler.

## Risks / Trade-offs

- **[Breaking change for worker-dashboard]** → The worker-dashboard loses its data source (the local HTTP API). It needs to be adapted to accept data via props or a context provider instead of fetching from localhost. Mitigation: the dashboard is an internal package and has no external consumers yet.

- **[Heartbeat timing in browser extensions]** → Browser extension service workers can be suspended by the browser. If the service worker is suspended between heartbeats, the hub may reclaim tasks. Mitigation: set heartbeat interval short enough relative to the browser's idle timeout, and claim only as many tasks as can be processed within a single service worker activation. The single-run timeout should account for this.

- **[Per-task lease renewal removed for HTTP mode]** → Workers that relied on per-task renewal will need to use the heartbeat endpoint. Mitigation: this is an internal change — no external consumers exist yet.

- **[Max hold time too short causes premature reclamation]** → If a project's max hold time is shorter than the time needed to process its tasks, tasks will be reclaimed while still being worked on. Mitigation: max hold time is nullable (opt-in) and documentation will recommend setting it generously relative to expected processing time.

## Migration Plan

1. Add `max_task_hold_time` column to `Project` table (nullable integer, Prisma migration)
2. Add `max_hold_expires_at` column to `Task` table (nullable DateTime, Prisma migration)
3. Add `POST /workers/heartbeat` endpoint to hub
4. Update reaper to check `max_hold_expires_at`
5. Refactor worker SDK: remove process lifecycle, Elysia dependency, bundled dashboard
6. Add single-run mode to worker SDK
7. Replace per-task lease renewal with worker-level heartbeat in HTTP mode
8. Add standalone `bin` entry point for backward-compatible `bun run` usage
9. Update documentation: separate hub/worker plugin terminology, new modes, heartbeat model

Rollback: all database changes are additive (new nullable columns). The heartbeat endpoint is new. The SDK refactoring is backward-compatible for the standalone entry point. No destructive migrations.

## Open Questions

- Should the hub require worker registration before accepting heartbeats (i.e., must the worker call `POST /workers/register` before `POST /workers/heartbeat`)? Or should the heartbeat implicitly register the worker if it doesn't exist?
- Should the claim endpoint accept a `maxHoldTime` override from the worker, or always use the project's configured value?
- What should the default `maxTaskHoldTime` be for new projects? (Recommendation: null — no limit by default, opt-in per project.)
