## Context

Dispatch currently authenticates only workers via JWT with a hard-coded `scope === 'worker'` check. There is no user model, no dashboard authentication, and no configurable mapping between external identity claims and internal permissions. The Rezics auth service issues JWTs with claims like `role`, `sub`, and `iss`. Workers carry these JWTs when registering with the hub.

The hub needs to:
1. Understand who is a root/superuser vs. a regular user
2. Map external JWT claims to internal permissions via configurable policies
3. Protect the dashboard and admin APIs with authentication
4. Support both Bearer token and session-based auth for dashboard access

Existing code: `package/hub/src/auth/jwt.ts` (JWKS verification), `package/hub/src/auth/middleware.ts` (scope guard), Prisma schema at `package/hub/prisma/schema.prisma`.

## Goals / Non-Goals

**Goals:**
- Root user stored in database (not env vars), with session management
- TrustPolicy table mapping `(issuer pattern, claim field, claim regex)` → permissions
- Single `permissions.ts` module as source of truth for all permission strings
- Unified identity resolution: JWT → check User table → match policies → `ResolvedIdentity`
- Dashboard auth via `Authorization: Bearer <token>` and session cookies
- Policy CRUD API for the superuser to manage trust policies from the dashboard
- Code simplicity: minimal abstractions, readable permission checks

**Non-Goals:**
- OAuth2 authorization code flow in the hub (frontend handles OAuth, hub validates tokens)
- Multi-tenancy / organization model
- Role hierarchy or inheritance (permissions are flat, additive)
- Rate limiting or IP-based access control
- User registration flow (users exist only as root entries or are resolved from policies)

## Decisions

### 1. Flat permission strings over RBAC

**Decision**: Use flat permission strings (`worker:register`, `dashboard:view`, `admin:policies`) rather than predefined roles with inheritance.

**Rationale**: Roles add indirection — you have to look up what `admin` means. Flat permissions are explicit and greppable. Policies map directly to permission arrays. The `permissions.ts` file lists every valid permission in one place.

**Alternative considered**: Role-based model with `Role` table and `RolePermission` join. Rejected because it adds two tables and a layer of indirection for a system that currently has ~15 permissions total.

### 2. Policy matching: issuer glob + claim field + regex

**Decision**: Each TrustPolicy row has `issPattern` (glob like `*.rezics.com`), `claimField` (e.g. `role`), and `claimPattern` (regex like `^owner$`). A policy matches when the JWT's `iss` matches the glob AND the specified claim field's value matches the regex.

**Rationale**: This is expressive enough to handle `auth.rezics.com` issuing `role=owner` tokens and `worker.rezics.com` issuing `role=user` tokens with different permission grants. Regex matching is more powerful than exact match (e.g. `^(owner|admin)$`).

**Alternative considered**: Exact match on issuer + exact match on claim value. Rejected because it requires multiple policy rows for minor variations and can't handle subdomain wildcards.

### 3. Root user in database with sessions

**Decision**: A `User` table with `id` (matching JWT `sub`), `isRoot` boolean, and timestamps. A `Session` table with token, userId, and expiry. The first root user is seeded via `prisma db seed` or a CLI command.

**Rationale**: The user explicitly prefers database-backed state over environment variables. Sessions enable the dashboard to maintain login state. The User table is intentionally minimal — it exists only to mark root users and anchor sessions.

**Bootstrap**: Initial root user created by `bunx prisma db seed` which reads a seed file, or by a `dispatch user create --root` CLI command. This is a one-time setup step.

### 4. Dual auth for dashboard: Bearer + Session

**Decision**: Dashboard API accepts either `Authorization: Bearer <jwt>` or a session cookie. Bearer tokens are verified through the standard JWT + policy pipeline. Session tokens are looked up in the Session table.

**Rationale**: Bearer support enables future OAuth2 flows where the frontend obtains tokens from Rezics auth. Session support provides a simpler UX for dashboard login (login once, stay logged in). Both resolve to the same `ResolvedIdentity`.

**Session flow**: POST `/auth/login` with a valid JWT → hub verifies JWT, checks User table, resolves permissions → creates a Session row → returns session token as `Set-Cookie` and in response body.

### 5. Identity resolution as a single pipeline

**Decision**: Replace `WorkerClaims` with `ResolvedIdentity`. One function `resolveIdentity(jwt)` handles the full flow:

```
verify JWT → extract claims → check User table (root?) → match policies → union permissions → return ResolvedIdentity
```

`ResolvedIdentity` contains: `sub`, `permissions: string[]`, `projects: string[] | "*"`, `isRoot: boolean`, and the original JWT claims.

**Rationale**: One code path for all auth. Worker endpoints check `hasPermission(identity, 'worker:register')`. Dashboard endpoints check `hasPermission(identity, 'dashboard:view')`. No separate middleware chains.

### 6. Permission checking via `permissions.ts`

**Decision**: A single `permissions.ts` file in the `hub` package that:
- Exports all permission string constants
- Exports `hasPermission(identity, permission)` — returns true if identity has the exact permission or a matching wildcard (`admin:*`)
- Exports `hasAnyPermission(identity, permissions[])` — returns true if any match
- Exports `isProjectScoped(identity, projectId)` — checks if identity has access to the given project

**Rationale**: Centralizing permissions in one file makes it easy to audit what permissions exist and grep for usage. Helper functions keep route guards one-liners.

### 7. Project scoping on policies

**Decision**: Each TrustPolicy has an optional `projectScope` field. When null, the granted permissions apply to all projects (`"*"`). When set to a claim field name (e.g. `project`), the permissions are scoped to the project ID found in that JWT claim.

**Rationale**: This lets `role=owner` get global access while `role=user` gets access only to the project specified in their token.

## Risks / Trade-offs

**[Glob matching complexity]** → Issuer glob matching (`*.rezics.com`) needs careful implementation to avoid regex injection or overly broad matches. Mitigation: use a simple glob-to-regex converter that only supports `*` wildcards in domain segments, not arbitrary regex.

**[Policy evaluation performance]** → Every request queries the TrustPolicy table. Mitigation: cache policies in memory with a TTL (e.g. 30s) or invalidate on write. The table will have very few rows (< 20 typically).

**[Root user bootstrap]** → If the seed/CLI step is skipped, no one can access the dashboard. Mitigation: on startup, log a warning if no root user exists. The dashboard can show a setup page when no root user is found (future enhancement, not in scope).

**[Breaking change to worker auth]** → Replacing `WorkerClaims` with `ResolvedIdentity` changes the middleware contract for all routes. Mitigation: update all route handlers in the same change. The `workerClaims` context variable becomes `identity` everywhere.

**[Session token security]** → Session tokens in cookies need `HttpOnly`, `Secure` (in production), `SameSite=Strict`. Mitigation: set these flags in the session creation endpoint.
