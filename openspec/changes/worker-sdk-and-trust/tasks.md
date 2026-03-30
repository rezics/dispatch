## 1. Worker Package Scaffold

- [ ] 1.1 Create `package/worker/` with `package.json`, `tsconfig.json`, `src/index.ts`
- [ ] 1.2 Add dependencies: `@rezics/dispatch-type`, `zod`
- [ ] 1.3 Add dev dependencies: `bun-types`

## 2. Worker Configuration

- [ ] 2.1 Implement `src/core/config.ts` — `defineWorkerConfig()` with Zod validation for hub URL, mode, concurrency, plugin tuples
- [ ] 2.2 Validate plugin configs against each plugin's Zod schema at configuration time
- [ ] 2.3 Auto-convert `https://` → `wss://` when mode is `ws`
- [ ] 2.4 Add unit tests: valid config, invalid URL, invalid plugin config, default values

## 3. Worker Plugin Registry

- [ ] 3.1 Implement `src/core/registry.ts` — plugin loading, capability aggregation, collision detection
- [ ] 3.2 Implement capability→handler map construction from registered plugins
- [ ] 3.3 Implement task routing: match `task.type` to handler, invoke with `PluginContext`
- [ ] 3.4 Implement `PluginContext` factory: scoped logger, progress callback (WS sends message, HTTP logs locally)
- [ ] 3.5 Implement plugin lifecycle: call `onLoad` in order at startup, `onUnload` in reverse at shutdown
- [ ] 3.6 Add unit tests: capability aggregation, collision throws, task routing, missing handler fails task

## 4. Worker Token Lifecycle

- [ ] 4.1 Implement `src/core/auth.ts` — `getToken()` wrapper with caching and auto-refresh scheduling
- [ ] 4.2 Decode JWT `exp` claim (without verification) to schedule refresh at 80% of remaining lifetime
- [ ] 4.3 Implement retry-on-401 logic: call `getToken()` once, retry request, fatal on second 401
- [ ] 4.4 Add unit tests: token refresh scheduling, retry-on-401, fatal on persistent auth failure

## 5. Worker HTTP Lease Mode

- [ ] 5.1 Implement `src/core/lease.ts` — poll loop: `POST /tasks/claim`, sleep on empty, dispatch to handlers
- [ ] 5.2 Implement concurrency semaphore: limit in-flight tasks, adjust claim `count` to remaining capacity
- [ ] 5.3 Implement auto-renewal timer: schedule at 70% of lease, call `POST /tasks/lease/renew`
- [ ] 5.4 Implement batch completion: collect done/failed results, submit via `POST /tasks/complete`
- [ ] 5.5 Implement partial completion for long batches (submit finished tasks before batch completes)
- [ ] 5.6 Implement graceful shutdown: SIGINT/SIGTERM → stop claiming, wait for in-flight, submit results, exit
- [ ] 5.7 Add integration tests: poll loop, concurrency limiting, lease renewal, graceful shutdown

## 6. Worker WebSocket Mode

- [ ] 6.1 Implement `src/core/connection.ts` — WS client: connect with JWT auth header, send register message
- [ ] 6.2 Implement message handler: dispatch `task:dispatch` to plugin handlers, handle `task:cancel` via AbortController
- [ ] 6.3 Implement heartbeat: send `{ type: 'heartbeat', activeTaskIds }` every 15s
- [ ] 6.4 Implement result sending: `task:done`, `task:fail`, `task:progress` messages
- [ ] 6.5 Implement auto-reconnect with exponential backoff: `min(1s * 2^attempt + jitter, 30s)`, re-register on reconnect
- [ ] 6.6 Add unit tests: register on connect, message routing, heartbeat interval, reconnect backoff

## 7. Worker Entry Point

- [ ] 7.1 Implement `src/core/worker.ts` — `createWorker(config)` that wires registry, auth, and mode (lease or WS)
- [ ] 7.2 Export public API from `src/index.ts`: `createWorker`, `defineWorkerConfig`, `definePlugin` (re-export from type)
- [ ] 7.3 Add end-to-end test: create worker with mock plugin, start in HTTP mode against mock hub, claim → execute → complete

## 8. Hub WebSocket Manager

- [ ] 8.1 Implement `src/ws/manager.ts` — track connected workers by ID, WS connection, capabilities, active task count
- [ ] 8.2 Implement Elysia WS route at `/workers`: authenticate upgrade, parse messages (register, heartbeat, task:done, task:fail, task:progress)
- [ ] 8.3 Implement task dispatch logic: on new pending task, find matching WS worker with available concurrency, send `task:dispatch`
- [ ] 8.4 Implement heartbeat timeout: mark worker offline and close connection after 30s without heartbeat
- [ ] 8.5 Implement `task:cancel` sending when admin removes a task
- [ ] 8.6 Store task progress from `task:progress` messages for API query
- [ ] 8.7 Add OpenAPI documentation for the WS endpoint
- [ ] 8.8 Add integration tests: WS connect, register, dispatch, heartbeat timeout, progress tracking

## 9. Hub Notary (Trust Verification)

- [ ] 9.1 Implement `src/notary/receipt.ts` — `verifyReceipt(receipt, secret)`: HMAC-SHA256 signature check, field validation (taskIds, workerId, project, expiry)
- [ ] 9.2 Implement `src/notary/nonce.ts` — nonce anti-replay: check `used_nonce` table, insert on accept
- [ ] 9.3 Implement trust-level dispatch in completion flow: `full` → skip, `receipted` → verify receipt, `audited` → reject (use `/tasks/audit`)
- [ ] 9.4 Implement `POST /tasks/audit` Elysia route: verify Main Server signature, mark tasks done
- [ ] 9.5 Export `signReceipt(receipt, secret)` utility from `@rezics/dispatch-type` for Main Server use
- [ ] 9.6 Add OpenAPI docs for `POST /tasks/audit` with security scheme
- [ ] 9.7 Add unit tests: valid receipt, bad signature, expired receipt, replayed nonce, audit flow

## 10. Hub Result Plugin System

- [ ] 10.1 Implement `src/plugin/interface.ts` — `ResultPlugin` interface definition
- [ ] 10.2 Implement `src/plugin/runner.ts` — result plugin runner: match `TaskResult.strategy` to plugin, call `handle`, log on failure (don't block completion)
- [ ] 10.3 Implement `src/plugin/store.ts` — built-in `store` plugin: upsert `task_result` row
- [ ] 10.4 Implement `src/plugin/webhook.ts` — built-in `webhook` plugin: HTTP POST to URL with data and headers, log non-2xx
- [ ] 10.5 Implement `src/plugin/discard.ts` — built-in `discard` plugin: no-op
- [ ] 10.6 Implement custom plugin registration in hub config
- [ ] 10.7 Implement per-project plugin enable/disable via `result_plugin` table
- [ ] 10.8 Add integration tests: store writes to DB, webhook fires HTTP, discard no-op, disabled plugin skipped

## 11. Hub API Updates

- [ ] 11.1 Update `POST /tasks/complete` to enforce receipt for `receipted` projects and route done tasks through result plugin runner
- [ ] 11.2 Add `POST /tasks/audit` route to Elysia API with OpenAPI tags and security scheme
- [ ] 11.3 Update `GET /tasks/:id` to include progress data (percent, message) when available
- [ ] 11.4 Add integration tests: receipted completion, audit flow, progress in task response

## 12. End-to-End Verification

- [ ] 12.1 E2E test: HTTP Lease full loop — create project → create tasks → worker claims → executes → completes → verify status + result stored
- [ ] 12.2 E2E test: WebSocket full loop — create project → create tasks → worker connects → receives dispatch → completes via WS → verify
- [ ] 12.3 E2E test: Receipted trust flow — Main Server signs receipt → worker submits with receipt → hub verifies → done
- [ ] 12.4 E2E test: Audited trust flow — worker submits to Main Server → Main Server calls `/tasks/audit` → hub verifies → done
