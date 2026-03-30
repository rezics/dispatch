## 1. Monorepo & Workspace Setup

- [x] 1.1 Initialize root `package.json` with Bun workspaces pointing to `package/*`
- [x] 1.2 Create `biome.json` with linting and formatting rules
- [x] 1.3 Create `bunfig.toml` with workspace settings
- [x] 1.4 Create `.env.development` with default `DATABASE_URL`, `PORT`, `NODE_ENV=development`
- [x] 1.5 Create `.env.production` template with placeholder values
- [x] 1.6 Create `docker-compose.yml` with PostgreSQL service for local dev

## 2. @rezics/dispatch-type Package

- [x] 2.1 Scaffold `package/type/` with `package.json`, `tsconfig.json`, and `src/index.ts`
- [x] 2.2 Implement `src/task.ts` — `Task`, `TaskStatus`, `TaskResult` types
- [x] 2.3 Implement `src/plugin.ts` — `DispatchPlugin`, `PluginContext`, `definePlugin()`, `TrustLevel`
- [x] 2.4 Implement `src/message.ts` — `WorkerMessage` and `HubMessage` discriminated unions
- [x] 2.5 Implement `src/receipt.ts` — `CompletionReceipt` interface
- [x] 2.6 Export all public types from `src/index.ts`
- [x] 2.7 Add unit tests for `definePlugin()` (valid plugin passes, missing handler throws)

## 3. Hub Package Scaffold & Environment

- [x] 3.1 Scaffold `package/hub/` with `package.json`, `tsconfig.json`
- [x] 3.2 Add dependencies: `elysia`, `@elysiajs/openapi`, `@elysiajs/cors`, `@elysiajs/bearer`, `@elysiajs/server-timing`, `prisma`, `@prisma/client`, `prismabox`, `jose`, `zod`, `@t3-oss/env-core`, `@rezics/dispatch-type`
- [x] 3.3 Implement `src/env.ts` — t3-env configuration with all required/optional variables and Zod schemas
- [x] 3.4 Add tests for env validation (missing DATABASE_URL fails, defaults applied)

## 4. Hub Database (Prisma)

- [x] 4.1 Create `prisma/schema.prisma` with Project, Worker, Task, TaskResult, UsedNonce, ResultPlugin models
- [x] 4.2 Add `prismabox` generator to schema for TypeBox model generation (`typeboxImportDependencyName: "elysia"`, `typeboxImportVariableName: "t"`, `inputModel: true`)
- [x] 4.3 Add partial indexes for dispatch (pending tasks) and reaper (expired leases) via `@@index` and raw SQL in migration
- [x] 4.4 Run `prisma migrate dev` to generate initial migration and `prisma generate` to produce prismabox models
- [x] 4.5 Create `src/db.ts` — Prisma client singleton export
- [x] 4.6 Create `src/model/index.ts` — re-export prismabox-generated models, register as Elysia reference models with namespace prefixes (e.g., `Task.Create`, `Worker.Register`)
- [x] 4.7 Add integration tests: task creation with defaults, nonce uniqueness constraint

## 5. Hub Auth

- [x] 5.1 Implement `src/auth/jwt.ts` — `verifyWorkerToken()` using `jose.createRemoteJWKSet`, multi-provider loop
- [x] 5.2 Implement `src/auth/middleware.ts` — Elysia plugin using `@elysiajs/bearer` for token extraction + `jose` for verification, attaches typed `workerClaims` to context via `.derive()`
- [x] 5.3 Implement scope guard (reject non-`worker` scope on worker endpoints)
- [x] 5.4 Implement capability whitelist enforcement (JWT capabilities override registration)
- [x] 5.5 Add unit tests with mocked JWKS (valid token, expired token, wrong scope, capability override)

## 6. Hub Queue Engine

- [x] 6.1 Implement `src/queue/claim.ts` — `claimTasks(workerId, project, count, leaseDuration)` using `$queryRaw` with SKIP LOCKED
- [x] 6.2 Implement `src/queue/complete.ts` — `completeTasks(done, failed)` with retry logic (reset to pending vs permanent fail)
- [x] 6.3 Implement `src/queue/renew.ts` — `renewLease(taskIds, workerId, extend)` with expired-lease check
- [x] 6.4 Implement `src/queue/create.ts` — `createTask(project, type, payload, options)` insert
- [x] 6.5 Add integration tests: concurrent claim returns disjoint sets, priority ordering, lease expiry blocks renewal, retry/fail logic

## 7. Hub Reaper

- [x] 7.1 Implement `src/reaper/reaper.ts` — interval loop that resets retryable expired tasks and fails exhausted ones
- [x] 7.2 Add nonce cleanup to reaper loop (delete expired `used_nonce` rows)
- [x] 7.3 Make interval configurable via `env.REAPER_INTERVAL`
- [x] 7.4 Add integration tests: expired task reset, exhausted task failed, nonces purged

## 8. Hub Elysia API

- [x] 8.1 Implement `src/api/tasks.ts` — `POST /tasks`, `GET /tasks`, `GET /tasks/:id` routes using prismabox reference models for validation and `detail` for OpenAPI tags/descriptions
- [x] 8.2 Implement `src/api/claim.ts` — `POST /tasks/claim`, `POST /tasks/lease/renew`, `POST /tasks/complete` routes (auth-guarded) with OpenAPI security scheme annotations
- [x] 8.3 Implement `src/api/workers.ts` — `GET /workers`, `GET /workers/:id`, `DELETE /workers/:id` routes with OpenAPI tags
- [x] 8.4 Implement `src/api/projects.ts` — `GET /projects`, `POST /projects`, `PATCH /projects/:id`, `GET /projects/:id/stats` routes with OpenAPI tags
- [x] 8.5 Compose all route groups in `src/index.ts` — create Elysia app, mount plugins (`@elysiajs/openapi` at `/openapi`, `@elysiajs/cors`, `@elysiajs/bearer`, `@elysiajs/server-timing`), mount auth middleware, mount route groups, start server
- [x] 8.6 Configure OpenAPI plugin with project info, Bearer JWT security scheme, and tag groupings (Tasks, Workers, Projects)
- [x] 8.7 Add API integration tests: task CRUD, claim flow, project management, auth rejection on missing/invalid JWT
- [x] 8.8 Verify OpenAPI spec: start server, check `/openapi` renders docs and `/openapi/json` returns valid spec with all endpoints

## 9. Smoke Test & Verify

- [x] 9.1 Start hub via `docker-compose up` + `bun run dev`, verify all endpoints respond
- [x] 9.2 End-to-end test: create project → create tasks → claim → complete → verify status transitions
