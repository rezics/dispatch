## Context

Worker authentication currently flows through a multi-layer system: JWT → global AuthProvider list → AccessPolicy pattern matching → project resolution. The AccessPolicy table maps JWT issuer/claim patterns to project scopes using glob and regex matching, with a 30-second in-memory cache. This was designed for multi-tenant flexibility but adds unnecessary complexity for a root-managed system where projects are explicitly created via dashboard.

Current flow:
```
Worker request → extract Bearer JWT
  → build AuthProvider list from env vars (DISPATCH_AUTH_JWKS_URI, etc.)
  → try each provider's JWKS endpoint until signature validates
  → load AccessPolicy rows (cached 30s)
  → for each policy: match issuer glob, match claim regex
  → collect matching project scopes → WorkerIdentity { sub, projects }
```

## Goals / Non-Goals

**Goals:**
- Simplify worker auth to: request specifies project → verify JWT against that project's JWKS
- Remove AccessPolicy table and its API surface
- Remove global auth environment variables
- Maintain JWKS caching for performance

**Non-Goals:**
- Changing the verification/receipt system (receipted/audited/none)
- Changing admin/session auth
- Changing WebSocket worker registration flow (though it will benefit from the simplified auth)

## Decisions

### 1. Project-scoped JWKS verification

**Choice**: Worker requests include a `project` identifier. The middleware looks up `project.jwksUri` and verifies the JWT against it.

**Why**: The project already stores `jwksUri`. Making it the single source of truth eliminates the indirection of policies. If two projects share the same JWKS provider, workers naturally have access to both — same behavior as before, but implicit rather than configured.

**Alternative considered**: Keep a simplified policy table with just `project → jwksUri` mapping. Rejected because this is exactly what `project.jwksUri` already is.

### 2. Require `jwksUri` for worker-facing projects

**Choice**: If a project has no `jwksUri` configured, worker auth fails with 401. Projects with `verification: "none"` still need JWKS for worker identity.

**Why**: Verification mode controls *task completion* trust, not *worker identity*. Even in `none` mode, we still want to know which worker is claiming tasks.

**Alternative considered**: Allow unauthenticated workers for `verification: "none"` projects. Rejected — worker identity is needed for lease tracking and debugging regardless of completion trust.

### 3. Keep existing JWKS cache

**Choice**: Reuse the per-URI `jose.createRemoteJWKSet` cache map.

**Why**: Already handles JWKS rotation and caching. No change needed — just called with `project.jwksUri` instead of a global provider URI.

### 4. Worker identity from JWT `sub` claim

**Choice**: Worker ID derived from JWT `sub` claim (current behavior, unchanged).

**Why**: Standard JWT practice. No reason to change.

## Risks / Trade-offs

- **[Breaking change]** Existing deployments with AccessPolicy configurations will lose those policies on migration → Document migration path: ensure each project has `jwksUri` set before upgrading
- **[Project lookup on every request]** Middleware now queries the project table per request → Mitigate with a short TTL cache (same 30s pattern as current policy cache), or rely on Prisma's connection pooling since it's a PK lookup
- **[No cross-project discovery]** Workers can no longer "discover" which projects they can access via policies → Not needed in root-managed model; workers are configured to target specific projects
