## 1. Worker Package Scaffold

- [x] 1.1 Create `package/worker/` with `package.json`, `tsconfig.json`, `src/index.ts`
- [x] 1.2 Add dependencies: `@rezics/dispatch-type`, `zod`
- [x] 1.3 Add dev dependencies: `bun-types`

## 2. Worker Configuration

- [x] 2.1 Implement `src/core/config.ts` — `defineWorkerConfig()` with Zod validation for hub URL, mode, concurrency, plugin tuples
- [x] 2.2 Validate plugin configs against each plugin's Zod schema at configuration time
- [x] 2.3 Auto-convert `https://` → `wss://` when mode is `ws`
- [x] 2.4 Add unit tests: valid config, invalid URL, invalid plugin config, default values

## 3. Worker Plugin Registry

- [x] 3.1 Implement `src/core/registry.ts` — plugin loading, capability aggregation, collision detection
- [x] 3.2 Implement capability→handler map construction from registered plugins
- [x] 3.3 Implement task routing: match `task.type` to handler, invoke with `PluginContext`
- [x] 3.4 Implement `PluginContext` factory: scoped logger, progress callback (WS sends message, HTTP logs locally)
- [x] 3.5 Implement plugin lifecycle: call `onLoad` in order at startup, `onUnload` in reverse at shutdown
- [x] 3.6 Add unit tests: capability aggregation, collision throws, task routing, missing handler fails task

## 4. Worker Token Lifecycle

- [x] 4.1 Implement `src/core/auth.ts` — `getToken()` wrapper with caching and auto-refresh scheduling
- [x] 4.2 Decode JWT `exp` claim (without verification) to schedule refresh at 80% of remaining lifetime
- [x] 4.3 Implement retry-on-401 logic: call `getToken()` once, retry request, fatal on second 401
- [x] 4.4 Add unit tests: token refresh scheduling, retry-on-401, fatal on persistent auth failure

## 5. Worker HTTP Lease Mode

- [x] 5.1 Implement `src/core/lease.ts` — poll loop: `POST /tasks/claim`, sleep on empty, dispatch to handlers
- [x] 5.2 Implement concurrency semaphore: limit in-flight tasks, adjust claim `count` to remaining capacity
- [x] 5.3 Implement auto-renewal timer: schedule at 70% of lease, call `POST /tasks/lease/renew`
- [x] 5.4 Implement batch completion: collect done/failed results, submit via `POST /tasks/complete`
- [x] 5.5 Implement partial completion for long batches (submit finished tasks before batch completes)
- [x] 5.6 Implement graceful shutdown: SIGINT/SIGTERM → stop claiming, wait for in-flight, submit results, exit
- [x] 5.7 Add integration tests: poll loop, concurrency limiting, lease renewal, graceful shutdown

## 6. Worker WebSocket Mode

- [x] 6.1 Implement `src/core/connection.ts` — WS client: connect with JWT auth header, send register message
- [x] 6.2 Implement message handler: dispatch `task:dispatch` to plugin handlers, handle `task:cancel` via AbortController
- [x] 6.3 Implement heartbeat: send `{ type: 'heartbeat', activeTaskIds }` every 15s
- [x] 6.4 Implement result sending: `task:done`, `task:fail`, `task:progress` messages
- [x] 6.5 Implement auto-reconnect with exponential backoff: `min(1s * 2^attempt + jitter, 30s)`, re-register on reconnect
- [x] 6.6 Add unit tests: register on connect, message routing, heartbeat interval, reconnect backoff

## 7. Worker Entry Point

- [x] 7.1 Implement `src/core/worker.ts` — `createWorker(config)` that wires registry, auth, and mode (lease or WS)
- [x] 7.2 Export public API from `src/index.ts`: `createWorker`, `defineWorkerConfig`, `definePlugin` (re-export from type)
- [x] 7.3 Add end-to-end test: create worker with mock plugin, start in HTTP mode against mock hub, claim → execute → complete

## 8. Hub WebSocket Manager

- [x] 8.1 Implement `src/ws/manager.ts` — track connected workers by ID, WS connection, capabilities, active task count
- [x] 8.2 Implement Elysia WS route at `/workers`: authenticate upgrade, parse messages (register, heartbeat, task:done, task:fail, task:progress)
- [x] 8.3 Implement task dispatch logic: on new pending task, find matching WS worker with available concurrency, send `task:dispatch`
- [x] 8.4 Implement heartbeat timeout: mark worker offline and close connection after 30s without heartbeat
- [x] 8.5 Implement `task:cancel` sending when admin removes a task
- [x] 8.6 Store task progress from `task:progress` messages for API query
- [x] 8.7 Add OpenAPI documentation for the WS endpoint
- [x] 8.8 Add integration tests: WS connect, register, dispatch, heartbeat timeout, progress tracking

## 9. Hub Notary (Trust Verification)

- [x] 9.1 Implement `src/notary/receipt.ts` — `verifyReceipt(receipt, secret)`: HMAC-SHA256 signature check, field validation (taskIds, workerId, project, expiry)
- [x] 9.2 Implement `src/notary/nonce.ts` — nonce anti-replay: check `used_nonce` table, insert on accept
- [x] 9.3 Implement trust-level dispatch in completion flow: `full` → skip, `receipted` → verify receipt, `audited` → reject (use `/tasks/audit`)
- [x] 9.4 Implement `POST /tasks/audit` Elysia route: verify Main Server signature, mark tasks done
- [x] 9.5 Export `signReceipt(receipt, secret)` utility from `@rezics/dispatch-type` for Main Server use
- [x] 9.6 Add OpenAPI docs for `POST /tasks/audit` with security scheme
- [x] 9.7 Add unit tests: valid receipt, bad signature, expired receipt, replayed nonce, audit flow

## 10. Hub Result Plugin System

- [x] 10.1 Implement `src/plugin/interface.ts` — `ResultPlugin` interface definition
- [x] 10.2 Implement `src/plugin/runner.ts` — result plugin runner: match `TaskResult.strategy` to plugin, call `handle`, log on failure (don't block completion)
- [x] 10.3 Implement `src/plugin/store.ts` — built-in `store` plugin: upsert `task_result` row
- [x] 10.4 Implement `src/plugin/webhook.ts` — built-in `webhook` plugin: HTTP POST to URL with data and headers, log non-2xx
- [x] 10.5 Implement `src/plugin/discard.ts` — built-in `discard` plugin: no-op
- [x] 10.6 Implement custom plugin registration in hub config
- [x] 10.7 Implement per-project plugin enable/disable via `result_plugin` table
- [x] 10.8 Add integration tests: store writes to DB, webhook fires HTTP, discard no-op, disabled plugin skipped

## 11. Hub API Updates

- [x] 11.1 Update `POST /tasks/complete` to enforce receipt for `receipted` projects and route done tasks through result plugin runner
- [x] 11.2 Add `POST /tasks/audit` route to Elysia API with OpenAPI tags and security scheme
- [x] 11.3 Update `GET /tasks/:id` to include progress data (percent, message) when available
- [x] 11.4 Add integration tests: receipted completion, audit flow, progress in task response

## 12. End-to-End Verification

- [x] 12.1 E2E test: HTTP Lease full loop — create project → create tasks → worker claims → executes → completes → verify status + result stored
- [x] 12.2 E2E test: WebSocket full loop — create project → create tasks → worker connects → receives dispatch → completes via WS → verify
- [x] 12.3 E2E test: Receipted trust flow — Main Server signs receipt → worker submits with receipt → hub verifies → done
- [x] 12.4 E2E test: Audited trust flow — worker submits to Main Server → Main Server calls `/tasks/audit` → hub verifies → done
