## Why

The dispatch system has a complete plan but no implementation yet. Before any workers, dashboards, or plugins can be built, we need the foundational type system and a working hub server. This change delivers the two base layers (Plan Phases 1 + 2) so that worker SDK development can begin immediately after.

## What Changes

- Create `@rezics/dispatch-type` package with all shared interfaces: `Task`, `TaskStatus`, `TaskResult`, `DispatchPlugin`, `PluginContext`, `definePlugin()`, WebSocket message unions, and `CompletionReceipt`
- Create `@rezics/dispatch-hub` package with:
  - Prisma schema and migrations for PostgreSQL (project, worker, task, task_result, used_nonce, result_plugin tables)
  - JWT verification using `jose` with JWKS caching and multi-provider support
  - Queue engine using `SKIP LOCKED` for concurrent task dispatch
  - Reaper loop for expired lease reclamation
  - Elysia HTTP API: `/tasks`, `/workers`, `/projects` endpoints
  - Type-safe environment configuration via `@t3-oss/env-core`
- Set up monorepo workspace structure with Bun workspaces

## Capabilities

### New Capabilities

- `shared-types`: Core TypeScript interfaces and types shared across all dispatch packages (Task, Plugin, Messages, Receipt)
- `hub-database`: Prisma schema, migrations, and database access layer for the hub's PostgreSQL store
- `hub-auth`: JWT verification with JWKS caching, multi-IdP support, and worker token claims validation
- `hub-queue`: SKIP LOCKED queue engine for task claiming, completion, failure, and lease management
- `hub-reaper`: Background loop that reclaims tasks with expired leases and fails exhausted retries
- `hub-api`: Elysia HTTP API for task management, worker management, and project management
- `hub-env`: Type-safe environment variable validation and loading via t3-env

### Modified Capabilities

(none -- greenfield project, no existing specs)

## Impact

- **New packages**: `package/type/`, `package/hub/` created in the monorepo
- **New dependencies**: `elysia`, `@elysiajs/openapi`, `@elysiajs/cors`, `@elysiajs/bearer`, `@elysiajs/server-timing`, `prisma`, `@prisma/client`, `prismabox`, `jose`, `zod`, `@t3-oss/env-core`
- **Database**: Requires a PostgreSQL instance (provided via docker-compose for local dev)
- **APIs**: Introduces the full hub HTTP API surface (`/tasks`, `/workers`, `/projects`, `/workers` WS endpoint defined but WS handler deferred to Phase 4)
- **Environment files**: `.env.development` and `.env.production` at repo root
