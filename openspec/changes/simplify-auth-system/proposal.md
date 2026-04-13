## Why

The current auth system conflates two unrelated concerns — admin access and worker access — into a single identity/permission model. This produces a 13-permission RBAC engine where only 4 permissions are enforced server-side, 9 are dead code, and the word "trust" is used for two conceptually different things (completion verification and JWT authorization). The result is a system that's hard to reason about, hard to document, and harder to configure than it needs to be. Projects are the primary access boundary for workers, but this is obscured by generic permission bags and wildcard matching.

## What Changes

- **BREAKING**: Remove the `permissions` field from access policies (formerly "trust policies"). Policies now grant project access directly — a match means "this JWT is a worker on this project."
- **BREAKING**: Split the unified auth middleware into two separate paths: `requireAdmin()` (session cookie, root user check) and `requireWorker(projectId)` (JWT, access policy match). These paths never cross.
- **BREAKING**: Remove JWT-based dashboard login. Admin users authenticate via password → session only. JWT is exclusively for worker-hub integration.
- **BREAKING**: Rename `trustLevel` to `verification` on the Project model. Rename the `"full"` level to `"none"`. This clarifies that the setting controls completion verification, not authorization.
- **BREAKING**: Rename the `TrustPolicy` model to `AccessPolicy`. Drop the `permissions` column.
- Delete the entire permission system: `PERMISSIONS` constant, `hasPermission()`, `hasAnyPermission()`, `requirePermission()`, and wildcard matching logic.
- Delete the unified `ResolvedIdentity` type. Replace with separate `AdminSession` and `WorkerIdentity` types.
- Protect currently-open admin routes: project CRUD and worker deletion now require root.

## Capabilities

### New Capabilities
- `hub-access-policy`: Access policy resolution — matching JWT claims against policies to determine project access for workers. Replaces the permission-based trust policy system.
- `hub-admin-auth`: Admin authentication path — password login, session management, root user verification for admin/dashboard routes.
- `hub-worker-auth`: Worker authentication path — JWT verification and project-scoped access control for worker routes.
- `hub-route-protection`: Route-level auth requirements — which routes require admin, worker, or no auth.

### Modified Capabilities
- `hub-notary`: Rename `trustLevel` to `verification`, rename `"full"` to `"none"` across receipt and audit logic.
- `hub-api`: Update route protection to use new middleware. Protect project CRUD and worker deletion with admin auth.
- `hub-dashboard`: Remove permission-based nav filtering. Dashboard is root-only, all nav items always visible.

## Impact

- **Hub auth** (`package/hub/src/auth/`): Major rewrite — new middleware, new identity types, delete permission system, rewrite policy resolution.
- **Hub API routes** (`package/hub/src/api/`): Update all route groups to use `requireAdmin()` or `requireWorker()` instead of `requirePermission()`.
- **Prisma schema** (`package/hub/prisma/`): Rename `TrustPolicy` → `AccessPolicy`, drop `permissions` column. Rename `trustLevel` → `verification` on Project, rename enum value `full` → `none`. Migration required.
- **Dashboard** (`package/hub-dashboard/`): Remove `AuthContext` permission checking, remove permission-based nav filtering. Login flow is password-only.
- **Type package** (`package/type/`): Update shared types — `TrustLevel` enum rename, remove permission-related exports.
- **Worker SDK** (`package/worker/`): No changes needed — workers already just send a JWT and don't care about permission strings.
- **Documentation** (`docs/`): Rewrite Trust & Verification guide. Split into separate Access Control and Verification pages. Add scenario walkthroughs (public dispatch, restricted project, etc.).
