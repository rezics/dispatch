## Context

The hub currently has a single auth middleware that handles both admin (session cookie) and worker (JWT) authentication, producing a unified `ResolvedIdentity` with a `permissions: string[]` bag. Route handlers then call `requirePermission(identity, "some:permission")` to gate access. This design was modeled on generic RBAC but doesn't fit the actual access model, which is binary: you're either an admin (root) managing the system, or a worker processing tasks on specific projects.

Of the 13 defined permissions, only 4 are checked server-side. The rest are dead code or UI-only ceremony. The `TrustPolicy` model maps JWT claims to permission strings, but the permissions are always the same set for workers — there's no real scenario where a worker would have `task:claim` but not `task:complete`.

The Prisma schema has `TrustPolicy` (authorization) and `trustLevel` on Project (verification) using the same "trust" vocabulary for unrelated concepts.

## Goals / Non-Goals

**Goals:**
- Separate admin auth (session/password) and worker auth (JWT/policy) into independent paths with no shared identity type
- Replace the 13-permission RBAC system with two role-based checks: `requireAdmin()` and `requireWorker(projectId)`
- Simplify access policies to grant project access directly, without a permissions array
- Rename trust-level terminology to "verification" to eliminate naming ambiguity
- Protect currently-open admin routes (project CRUD, worker deletion)

**Non-Goals:**
- Changing how JWT verification works (JWKS, multi-provider, caching) — that layer is fine
- Adding new auth mechanisms (API keys, OAuth flows, etc.)
- Changing the receipt/audit verification logic itself — only renaming the trust level field
- Restructuring the worker SDK — it already just sends a JWT

## Decisions

### 1. Two middleware functions, not one

**Decision:** Replace the unified `authMiddleware` with two separate Elysia plugins: `adminAuth(db)` and `workerAuth(providers, db)`.

`adminAuth` checks the session cookie, loads the user, and verifies `isRoot`. It produces an `AdminSession { userId, isRoot }` — no permissions, no projects, no claims.

`workerAuth` checks the Bearer JWT, verifies it against providers, matches access policies, and produces a `WorkerIdentity { sub, projects }`. It never looks at session cookies.

**Why not keep one middleware with a role discriminator?** The two paths have zero shared logic — JWT verification vs cookie lookup, policy resolution vs root check, project scoping vs full access. A unified middleware just adds a branch that makes each path harder to understand. Splitting them makes the code match the mental model.

**Alternative considered:** A single middleware that returns a discriminated union (`{ role: 'admin', ... } | { role: 'worker', ... }`). Rejected because it still couples the two paths and every route handler would need to narrow the union type.

### 2. Access policies grant project access, not permissions

**Decision:** Drop the `permissions` column from the `AccessPolicy` (currently `TrustPolicy`) table. A matching policy means "this JWT is a worker on `projectScope`." If `projectScope` is null, the policy grants access to all projects.

**Resolution logic becomes:**
```
resolveWorkerAccess(claims, db) → { sub, projects: string[] | '*' }

1. Load access policies (cached 30s, same as today)
2. For each policy:
   - Match issPattern against JWT iss
   - Extract claimField from JWT
   - Test claimPattern regex against extracted value
   - If match: add projectScope to projects set (or set global flag if null)
3. Return { sub: claims.sub, projects }
```

No permission aggregation, no wildcard matching, no `hasPermission()` function.

**Alternative considered:** Keeping a simplified permissions field with just `worker` | `admin` role values. Rejected because admin access is already handled by the `isRoot` flag on User — policies only need to express worker access, and for workers, "access" is the only permission that matters.

### 3. Project scope resolution via `projectScope` field directly

**Decision:** When `projectScope` is a non-null string, it is treated as a literal project ID. The current code at `resolve.ts:106-109` treats `projectScope` as a *claim field name* and reads the project ID from the JWT:

```typescript
// Current behavior — projectScope is a claim field name
const projectId = claims[policy.projectScope]
```

This is confusing and undocumented. Change it so `projectScope` is the literal project ID:

```typescript
// New behavior — projectScope IS the project ID
projects.add(policy.projectScope)
```

If someone needs "project from JWT claim", that can be revisited. For now, the policy explicitly names the project.

**Why:** The current behavior means a policy with `projectScope: "project"` doesn't mean "scoped to project 'project'" — it means "read the project ID from the JWT's `project` claim." This is surprising and hard to reason about. Direct project IDs are explicit and predictable.

### 4. Admin route protection

**Decision:** Apply `adminAuth` middleware to these currently-unprotected route groups:

| Route group | Currently | After |
|---|---|---|
| `POST /projects` | Open | Admin |
| `PATCH /projects/:id` | Open | Admin |
| `GET /projects` | Open | Open (read-only, useful for workers to discover projects) |
| `GET /projects/:id/stats` | Open | Open (read-only stats) |
| `DELETE /workers/:id` | Open | Admin |
| `GET /workers` | Open | Open (read-only) |

`GET /projects` stays open because workers may need to discover available projects. Mutation endpoints require admin.

### 5. Verification mode rename

**Decision:** Rename at the Prisma column level:
- `Project.trustLevel` → `Project.verification`
- Value `"full"` → `"none"`
- `"receipted"` and `"audited"` stay the same

The `@default("receipted")` stays as the default — new projects require receipt verification unless explicitly configured otherwise.

The `receiptSecret` field stays on Project (unchanged). It's only required when `verification` is `"receipted"` or `"audited"`.

### 6. Dashboard auth simplification

**Decision:** The dashboard is root-only. Remove all permission-based nav filtering from the frontend `AuthContext`. The login page uses password auth only — remove any JWT login option from the UI.

The `GET /auth/me` endpoint continues to work via session cookie and returns the user without permissions (just `{ id, isRoot }`). The `POST /auth/login` endpoint accepts only `{ username, password }` — remove the Bearer JWT login path.

## Risks / Trade-offs

**[Risk] Breaking change for existing policy data** → The `permissions` column is dropped. Existing `TrustPolicy` rows lose their permissions data during migration. Mitigation: The migration renames the table and drops the column. Since permissions were effectively unused (workers always need the same set), no functional behavior is lost. Document in release notes.

**[Risk] `projectScope` semantic change breaks existing policies** → Policies that use `projectScope` as a claim field name (e.g., `projectScope: "project"` meaning "read the `project` claim from the JWT") will break. Mitigation: Check if any existing policies rely on the claim-field behavior. If so, the migration script should convert them to literal project IDs where possible, or flag them for manual review.

**[Risk] Removing JWT dashboard login** → Anyone currently using JWT to log into the dashboard will need to switch to password auth. Mitigation: This is a single-user (root-only) system. The root user has a password by definition. No functional loss.

**[Trade-off] No non-root admin role** → If the need arises for "can manage policies but not users," there's no way to express it. Accepted: YAGNI. Root-only admin is sufficient for a task dispatch system. A tiered admin model can be added later without affecting the worker auth path.

**[Trade-off] No per-route permission granularity for workers** → A worker with project access can claim, complete, register, and renew leases. There's no way to restrict a worker to "claim only." Accepted: No use case exists for partial worker capabilities.

## Migration Plan

1. **Prisma migration:**
   - Rename `TrustPolicy` → `AccessPolicy`
   - Drop `permissions` column from `AccessPolicy`
   - Rename `Project.trustLevel` → `Project.verification`
   - Update default and existing `"full"` values to `"none"`

2. **Code changes** (can be done in one pass since it's all in-repo):
   - Replace `authMiddleware` with `adminAuth` and `workerAuth`
   - Replace `resolveIdentity` with `resolveWorkerAccess`
   - Delete `permissions.ts` entirely
   - Update all route groups to use new middleware
   - Update dashboard `AuthContext` to remove permissions
   - Update dashboard login to remove JWT option
   - Update `hub-notary` references from `trustLevel` to `verification`, `"full"` to `"none"`

3. **Rollback:** Revert the Prisma migration (rename back, re-add column). The `permissions` data is lost on forward migration, but since it was ceremony, re-creating it from a template policy is trivial.

## Open Questions

- Should `GET /projects` require worker auth (JWT) rather than being fully open? It exposes the list of project IDs and their verification modes. Low risk but not zero.
- Should the `projectScope: null` (global worker) concept be kept or removed? It's convenient but means a single broad policy can grant access to every project, including future ones.
