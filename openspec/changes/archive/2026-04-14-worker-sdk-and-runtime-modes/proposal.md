## Why

The worker SDK currently assumes it owns the process (`process.on('SIGINT')`, `process.exit()`), bundles an Elysia HTTP server for its local dashboard, and uses browser-incompatible WebSocket features (custom headers). This makes it impossible to embed as a library inside a Tauri desktop app or browser extension — both of which are planned Rezics distribution targets. Additionally, the per-task lease renewal model is inefficient when a worker holds hundreds of tasks, and there is no mechanism to reclaim tasks from a worker that heartbeats forever but never completes work. The hub result plugin and worker plugin concepts are also conflated under the same "plugin" name in documentation.

## What Changes

- **Refactor the worker SDK to be runtime-agnostic.** Remove all process/server assumptions (no `process.on`, `process.exit`, `process.env`, no bundled Elysia server). The SDK becomes a pure library that any host environment can import and call `createWorker()` on.
- **Add single-run mode.** A new worker mode alongside continuous: claim a batch, process with heartbeat, stop when timeout is reached or all tasks complete. Designed for bounded-lifetime hosts like browser extension service workers and cron jobs.
- **Add worker-level heartbeat for HTTP mode.** One `POST /workers/heartbeat` request extends leases for all tasks held by that worker, replacing the current per-task lease renewal. More efficient at scale.
- **Add two-tier timeout with per-project max hold time.** Short-term: missed heartbeat causes lease expiry (worker is dead). Long-term: max hold time prevents a stuck worker from holding tasks indefinitely even while heartbeating. The max hold time is configurable per project on the hub.
- **Decouple the worker dashboard from the SDK.** The local HTTP dashboard API (port 45321) is removed from the worker SDK. It becomes the consuming application's responsibility to surface worker status however it wants.
- **Separate plugin terminology in documentation.** "Hub result plugins" (server-side result routing) and "worker plugins" (task handler modules) are clearly distinguished. Worker plugins may also be called "task modules" or "handlers" in documentation.
- **Establish the Rezics worker as both standalone and embeddable.** The Rezics-specific worker implementation (book-crawler, anime-crawler) is deployable as a standalone Bun program and importable as a library by Tauri apps and browser extensions.

## Capabilities

### New Capabilities

- `worker-single-run`: Single-run mode for bounded-lifetime workers. Claim once, process with heartbeat and configurable timeout, submit results, exit.
- `worker-heartbeat`: Worker-level heartbeat mechanism for HTTP mode. One request covers all claimed tasks. Configurable interval.
- `hub-heartbeat`: Hub-side heartbeat endpoint and max hold time management. Extends leases on heartbeat. Reclaims tasks when max hold time (configurable per project) is exceeded.

### Modified Capabilities

- `worker-config`: Remove process/server assumptions. Add single-run mode and timeout to config. Make runtime-agnostic (no Node/Bun globals required).
- `worker-lease`: Integrate with worker-level heartbeat. The poll loop and lease renewal now delegate to the heartbeat mechanism rather than renewing per-task.
- `worker-plugin-registry`: No behavioral change, but documentation clarifies these are "worker plugins" / "task handler modules", distinct from hub result plugins.
- `worker-dashboard`: **BREAKING** — Removed from the worker SDK package. No longer bundled. Consuming applications provide their own status UI.
- `hub-api`: Add `POST /workers/heartbeat` endpoint. Add `maxTaskHoldTime` field to project configuration.
- `hub-reaper`: Check max hold time expiry in addition to lease expiry. Reclaim tasks where `maxHoldExpiresAt` has passed regardless of heartbeat.
- `shared-types`: Add single-run config types, heartbeat message types, and max hold time to project type.

## Impact

- **Worker SDK (`@rezics/dispatch-worker`)**: Major refactoring. Elysia dependency removed. Process lifecycle code removed. New single-run mode added. Heartbeat replaces per-task lease renewal in HTTP mode. Public API surface changes (dashboard exports removed).
- **Hub (`@rezics/dispatch-hub`)**: New heartbeat endpoint. Project model gains `maxTaskHoldTime` field. Reaper gains max hold time check. Database migration needed.
- **Type package (`@rezics/dispatch-type`)**: New types for heartbeat, single-run config, max hold time.
- **Worker dashboard (`@rezics/dispatch-worker-dashboard`)**: Decoupled from SDK. May need adapter changes to work as a standalone embeddable component.
- **Documentation**: Plugin terminology cleanup throughout. New guides for single-run mode, embedding in Tauri/browser extensions.
- **Downstream consumers**: Tauri app and browser extension projects (separate repos) can now import the worker as a library.
