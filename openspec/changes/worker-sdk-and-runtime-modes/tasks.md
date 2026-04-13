## 1. Database & Types

- [ ] 1.1 Add `maxTaskHoldTime` (Int?, seconds) to `Project` model in Prisma schema
- [ ] 1.2 Add `maxHoldExpiresAt` (DateTime?) to `Task` model in Prisma schema
- [ ] 1.3 Run Prisma migration for the two new columns
- [ ] 1.4 Add `SingleRunConfig`, `WorkerStatus`, `ActiveTaskInfo` types to `@rezics/dispatch-type`
- [ ] 1.5 Add `maxHoldExpiresAt` field to the `Task` type in `@rezics/dispatch-type`
- [ ] 1.6 Update `WorkerMessage`/`HubMessage` if any new message types are needed for heartbeat protocol

## 2. Hub: Heartbeat Endpoint & Max Hold Time

- [ ] 2.1 Add `POST /workers/heartbeat` route to hub API — accepts `{ workerId }`, extends `leaseExpiresAt` for all running tasks owned by that worker
- [ ] 2.2 Update `POST /tasks/claim` to set `maxHoldExpiresAt = NOW() + project.maxTaskHoldTime` when the project has a non-null value
- [ ] 2.3 Add `maxTaskHoldTime` to `POST /projects` and `PATCH /projects/:id` request/response schemas
- [ ] 2.4 Update `GET /projects/:id` response to include `maxTaskHoldTime`
- [ ] 2.5 Update reaper to reclaim tasks where `maxHoldExpiresAt IS NOT NULL AND maxHoldExpiresAt < NOW()` using the same retry/fail logic as lease expiry
- [ ] 2.6 Write tests for heartbeat endpoint (valid, unauthenticated, no active tasks)
- [ ] 2.7 Write tests for max hold time (claim sets it, reaper reclaims, null means no limit)

## 3. Worker SDK: Remove Process/Server Assumptions

- [ ] 3.1 Remove `process.on('SIGINT')`/`process.on('SIGTERM')`/`process.exit()` from `createWorker()` in `worker.ts`
- [ ] 3.2 Remove `process.env.DEBUG` from default logger — accept logger via config or use a runtime-safe default
- [ ] 3.3 Remove Elysia dependency from `@rezics/dispatch-worker` package.json
- [ ] 3.4 Remove the local dashboard HTTP server code (port 45321) from the worker package
- [ ] 3.5 Add `status()` and `activeTasks()` methods to the worker object returned by `createWorker()`
- [ ] 3.6 Verify the SDK imports cleanly in an environment where `process` is undefined (no import-time crashes)

## 4. Worker SDK: Worker-Level Heartbeat

- [ ] 4.1 Implement heartbeat manager that sends `POST /workers/heartbeat` at configurable `heartbeatInterval`
- [ ] 4.2 Integrate heartbeat manager into `LeaseManager` (HTTP continuous mode) — start heartbeat on `start()`, stop on `stop()`
- [ ] 4.3 Remove per-task `POST /tasks/lease/renew` calls from `LeaseManager`
- [ ] 4.4 Remove the `renewLease()` method, `scheduleRenewal()`, and renewal timers from `LeaseManager`
- [ ] 4.5 Add `heartbeatInterval` to `defineWorkerConfig()` with default 60000ms
- [ ] 4.6 Add heartbeat failure logging (warn on single failure, error on sustained failures)
- [ ] 4.7 Write tests for heartbeat manager (interval firing, failure handling, stop cleanup)

## 5. Worker SDK: Single-Run Mode

- [ ] 5.1 Add `'single-run'` to the `mode` union in `defineWorkerConfig()`, with required `timeout` and optional `claimCount`
- [ ] 5.2 Implement single-run executor: claim once → process with heartbeat → resolve on completion or timeout
- [ ] 5.3 Implement graceful wind-down on timeout (stop new executions, wait `shutdownTimeout` for in-flight tasks)
- [ ] 5.4 Wire single-run mode into `createWorker()` alongside existing HTTP/WS mode selection
- [ ] 5.5 Write tests for single-run mode (all complete, timeout reached, no tasks, wind-down)

## 6. Worker SDK: Standalone Entry Point

- [ ] 6.1 Create `src/bin.ts` as the standalone Bun entry point — reads config from environment, handles SIGINT/SIGTERM, calls `createWorker().start()`
- [ ] 6.2 Add `"./bin"` subpath export to `@rezics/dispatch-worker` package.json
- [ ] 6.3 Verify standalone entry point works with `bun run` as a drop-in replacement for the current behavior

## 7. Documentation & Plugin Terminology

- [ ] 7.1 Update `docs/plugins/overview.md` to clearly distinguish "worker plugins" (task handler modules) from "hub result plugins" (server-side result routing)
- [ ] 7.2 Add documentation for single-run mode (config, lifecycle, use cases)
- [ ] 7.3 Add documentation for the heartbeat model (interval, grace period, max hold time)
- [ ] 7.4 Add documentation for embedding the worker as a library (Tauri, browser extension examples)
- [ ] 7.5 Update `docs/reference/` with new config options and worker methods
