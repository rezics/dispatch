## Why

With the hub server and shared types delivered in Phase 1+2, there is no client that can actually consume the hub's API. The worker SDK is the critical next piece — without it, the system has a server but no workers. Phases 3–6 together deliver a fully functional distributed task execution pipeline: workers that claim and run tasks, real-time WebSocket push, cryptographic trust verification, and pluggable result handling.

## What Changes

- Create `@rezics/dispatch-worker` package with:
  - `defineWorkerConfig()` for type-safe worker configuration
  - HTTP Lease mode: claim → execute → renew → complete loop with concurrency control
  - Plugin registry via `worker.use()` with capability aggregation
  - Token lifecycle management (auto-refresh before expiry)
  - Retry and error handling with configurable backoff
- Add WebSocket mode to both hub and worker:
  - Hub WS connection manager at `/workers` endpoint
  - Worker WS client with auto-reconnect and exponential backoff
  - Heartbeat protocol (15s interval, 30s timeout)
  - Real-time `task:progress` reporting
- Implement trust & notary system on the hub:
  - `CompletionReceipt` signing utility for Main Servers
  - Receipt verification in `/tasks/complete` for `receipted` trust level
  - Nonce store with anti-replay enforcement
  - `POST /tasks/audit` endpoint for `audited` trust level
  - Per-project trust level enforcement
- Implement result plugin system on the hub:
  - Result plugin interface and runner
  - Built-in strategies: `store` (persist to `task_result`), `webhook` (HTTP POST), `discard`
  - Custom plugin registration API at hub startup

## Capabilities

### New Capabilities

- `worker-config`: Type-safe worker configuration via `defineWorkerConfig()`, plugin tuple registration, mode/concurrency settings
- `worker-lease`: HTTP Lease mode — poll loop, batch claiming, concurrent execution, auto-renewal at 70% lease time, partial completion
- `worker-plugin-registry`: Plugin loading via `worker.use()`, capability aggregation from plugins, lifecycle hooks (onLoad/onUnload)
- `worker-token`: JWT token lifecycle management — `getToken()` callback, auto-refresh before expiry, retry on auth failure
- `hub-websocket`: Hub-side WS connection manager — accept connections at `/workers`, register workers, dispatch tasks, handle heartbeats, detect disconnects
- `worker-websocket`: Worker-side WS client — connect, register capabilities, receive dispatched tasks, send results, auto-reconnect with exponential backoff
- `hub-notary`: Receipt verification for `receipted` trust, nonce anti-replay store, `POST /tasks/audit` for `audited` trust, signing utility for Main Servers
- `hub-result-plugin`: Result plugin interface, runner that dispatches by `TaskResult.strategy`, built-in store/webhook/discard plugins, custom plugin registration

### Modified Capabilities

- `hub-api`: Adding WebSocket endpoint handler at `/workers`, `POST /tasks/audit` endpoint, receipt field enforcement on `/tasks/complete` when project trust is `receipted`
- `hub-queue`: Task completion now routes through result plugin runner before marking done; `receipted`/`audited` completions require verification before acceptance

## Impact

- **New package**: `package/worker/` (`@rezics/dispatch-worker`)
- **Modified package**: `package/hub/` — new WS manager, notary module, result plugin runner, updated API routes
- **New dependencies (worker)**: `ws` (or Bun native WebSocket), `@rezics/dispatch-type`
- **New dependencies (hub)**: none beyond existing (Elysia has built-in WS support)
- **APIs added**: `POST /tasks/audit`, hub WS handler at `/workers`
- **APIs modified**: `POST /tasks/complete` now enforces receipt for `receipted` projects
- **Breaking**: None — all changes are additive to the hub; worker package is entirely new
