## Context

This is a greenfield project — no existing code beyond the project plan and openspec scaffold. The dispatch system needs its type foundation and hub server before any other packages (worker SDK, dashboards, desktop app) can be developed. The plan specifies Bun runtime, Elysia HTTP framework, Prisma ORM, PostgreSQL, and t3-env for environment management.

## Goals / Non-Goals

**Goals:**

- Establish the `@rezics/dispatch-type` package with all shared interfaces so downstream packages can develop against stable types
- Deliver a working hub server (`@rezics/dispatch-hub`) that can accept task submissions, dispatch work via HTTP Lease, and manage projects/workers
- Set up the Prisma schema with all tables needed for the queue, workers, projects, receipts, and result plugins
- Implement JWT-based auth with multi-provider JWKS support
- Implement the SKIP LOCKED queue engine and reaper loop
- Configure t3-env for type-safe environment variables with `.env.development` / `.env.production`

**Non-Goals:**

- WebSocket push mode (Phase 4)
- Receipt/notary verification for `receipted` and `audited` trust levels (Phase 5)
- Result plugin runner beyond basic `store` and `discard` (Phase 6)
- Worker SDK, dashboards, or desktop app (Phases 3, 8, 9)
- i18n setup (deferred until dashboard work begins)
- Load testing or partitioning strategies (Phase 10)

## Decisions

### 1. Elysia as HTTP framework

**Choice**: Elysia over Hono or Fastify.

**Rationale**: Elysia is built specifically for Bun with deep runtime integration. It provides end-to-end type safety (request validation, response types) via its Eden Treaty, which aligns with the project's TypeScript-first philosophy. Elysia's plugin system maps naturally to the hub's modular route structure (auth, tasks, workers, projects).

**Alternatives considered**:
- Hono: More portable (works on Cloudflare, Deno) but we only target Bun. Elysia's tighter Bun integration wins.
- Fastify: Mature ecosystem but Node-oriented. Extra overhead on Bun.

### 2. Prisma as ORM

**Choice**: Prisma (latest) over Drizzle or raw SQL.

**Rationale**: Prisma provides a declarative schema, automatic migrations, and generated type-safe client. The schema serves as documentation. For the SKIP LOCKED claim query (which Prisma can't express natively), we use `$queryRaw` with Prisma's tagged template for type safety.

**Alternatives considered**:
- Drizzle: More SQL-like, lighter. But Prisma's migration tooling and schema-as-documentation is more valuable for a project that multiple contributors will onboard to.
- Raw SQL: Maximum control but no type safety, no migration management.

### 3. SKIP LOCKED claim via raw query

**Choice**: Use `prisma.$queryRaw` for the task claim operation.

**Rationale**: The `SELECT ... FOR UPDATE SKIP LOCKED` pattern is critical for concurrent dispatch and cannot be expressed in Prisma's query builder. A single raw query for this hot path is acceptable; all other database access uses the Prisma client normally.

### 4. Monorepo structure with Bun workspaces

**Choice**: Bun native workspaces (`workspaces` in root `package.json`).

**Rationale**: No need for Turborepo or Nx at this stage. Bun workspaces handle dependency resolution and linking. Build orchestration can be added later if needed.

### 5. Elysia plugin stack

**Choice**: `@elysiajs/openapi` + `@elysiajs/cors` + `@elysiajs/bearer` + `@elysiajs/server-timing` + `prismabox`.

**Rationale**: Each plugin addresses a distinct cross-cutting concern:

| Plugin | Purpose | Why |
|--------|---------|-----|
| `@elysiajs/openapi` | Auto-generate OpenAPI docs from route schemas | Every endpoint gets live, browsable documentation at `/openapi` with zero manual spec writing. Uses Scalar as the default UI provider. |
| `@elysiajs/cors` | Cross-origin request handling | Dashboard and external API consumers need CORS. Plugin gives declarative origin control. |
| `@elysiajs/bearer` | Extract `Authorization: Bearer <token>` | Clean token extraction following RFC6750, pairs with our jose verification layer. |
| `@elysiajs/server-timing` | Performance instrumentation | Exposes `Server-Timing` headers in development for diagnosing lifecycle bottlenecks. Auto-disabled in production. |
| `prismabox` | Generate TypeBox models from Prisma schema | Reuses Prisma models as Elysia validation schemas, ensuring database ↔ API type consistency and feeding OpenAPI docs automatically. |

**Alternatives considered**:
- `@elysiajs/jwt` plugin: Has built-in sign/verify, but we only *verify* external IdP tokens (not sign our own). Using `jose` directly gives more control over JWKS multi-provider flow.
- SwaggerUI provider for OpenAPI: Scalar is the default, lighter, and has better DX. SwaggerUI available as fallback via config.

**OpenAPI configuration approach**: Each route module (tasks, workers, projects) uses Elysia's `detail` property for `tags`, `description`, and `summary`. Models registered via `.model()` with namespace prefixes (e.g., `Task.Create`, `Worker.Register`) appear as named schemas in the spec. Security scheme configured globally as `Bearer` JWT.

### 6. Auth via jose library

**Choice**: `jose` for JWT verification and JWKS handling (not `@elysiajs/jwt`).

**Rationale**: `jose` is the standard runtime-agnostic JOSE library. It supports JWKS caching out of the box via `createRemoteJWKSet`, handles key rotation, and works natively in Bun without Node crypto polyfills. The Elysia JWT plugin is designed for signing+verifying your own tokens; we only verify external IdP tokens, making `jose` the better fit. We pair it with `@elysiajs/bearer` for clean token extraction.

### 7. Environment management with t3-env

**Choice**: `@t3-oss/env-core` with Zod validation.

**Rationale**: Catches misconfiguration at startup rather than at runtime. The validated `env` object provides full type safety and IDE autocomplete. Bun natively loads `.env.development` / `.env.production` based on `NODE_ENV`.

## Risks / Trade-offs

- **[Prisma raw query for SKIP LOCKED]** → The claim query bypasses Prisma's type system. Mitigation: wrap it in a typed repository function with explicit input/output types and integration tests.

- **[No WebSocket in this phase]** → Workers can only use HTTP Lease mode initially. Mitigation: the HTTP Lease mode is the primary mode for batch workloads (the main use case). WS is additive in Phase 4.

- **[No receipt verification]** → The `receipted` and `audited` trust flows are stubbed. All completions are accepted at face value. Mitigation: `trustLevel` column exists in schema; verification logic is added in Phase 5 without schema changes.

- **[Single PostgreSQL instance]** → No replication or failover. Mitigation: acceptable for initial development; docker-compose provides the dev instance. Production deployment guidance comes in Phase 10.
