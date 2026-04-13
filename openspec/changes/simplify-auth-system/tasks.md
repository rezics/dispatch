## 1. Prisma Schema Migration

- [x] 1.1 Rename `TrustPolicy` model to `AccessPolicy` and drop the `permissions` column
- [x] 1.2 Rename `Project.trustLevel` to `Project.verification` and rename the `"full"` default/values to `"none"`
- [x] 1.3 Generate and apply the Prisma migration, regenerate the client

## 2. Auth Core — New Identity Types and Middleware

- [x] 2.1 Create `WorkerIdentity` type (`{ sub: string, projects: string[] | '*' }`) and `AdminSession` type (`{ userId: string, isRoot: boolean }`)
- [x] 2.2 Rewrite `resolve.ts` — replace `resolveIdentity` with `resolveWorkerAccess(claims, db)` that returns `WorkerIdentity` (match access policies, collect project scopes as literal IDs, no permission aggregation)
- [x] 2.3 Create `adminAuth(db)` Elysia middleware — reads `dispatch_session` cookie, looks up session + user, verifies `isRoot`, produces `AdminSession`
- [x] 2.4 Create `workerAuth(providers, db)` Elysia middleware — reads Bearer JWT, verifies via providers, calls `resolveWorkerAccess`, produces `WorkerIdentity`
- [x] 2.5 Add `requireProjectAccess(identity: WorkerIdentity, projectId: string)` helper that throws 403 if the worker lacks access to the project
- [x] 2.6 Delete `permissions.ts` entirely (PERMISSIONS constant, hasPermission, hasAnyPermission, requirePermission, ResolvedIdentity type)
- [x] 2.7 Delete the old unified `authMiddleware` from `middleware.ts`

## 3. Route Updates — Apply New Middleware

- [x] 3.1 Update `claim.ts` routes (`/tasks/claim`, `/tasks/complete`, `/tasks/lease/renew`) — use `workerAuth`, replace `requirePermission` with `requireProjectAccess`
- [x] 3.2 Update `policies.ts` routes — use `adminAuth`, remove `requirePermission` calls
- [x] 3.3 Update `users.ts` routes — use `adminAuth`, remove `requirePermission` calls
- [x] 3.4 Update `projects.ts` — add `adminAuth` to `POST /projects` and `PATCH /projects/:id`, keep `GET` routes public
- [x] 3.5 Update `workers.ts` — add `adminAuth` to `DELETE /workers/:id`, keep `GET` routes public
- [x] 3.6 Update WebSocket route (`ws/route.ts`) — use `workerAuth` (JWT from query param), replace `hasPermission(WORKER_REGISTER)` with project access check
- [x] 3.7 Update `auth.ts` login route — remove JWT login path, accept only `{ username, password }`

## 4. Notary — Verification Rename

- [x] 4.1 Update notary code to reference `project.verification` instead of `project.trustLevel`
- [x] 4.2 Update all comparisons from `"full"` to `"none"` in receipt enforcement and audit logic

## 5. Shared Types

- [x] 5.1 Update the `@rezics/dispatch-type` package — rename `TrustLevel` type, update any exported trust-related types
- [x] 5.2 Remove any permission-related type exports from shared packages

## 6. Dashboard

- [x] 6.1 Remove permission-based nav filtering from the navigation component
- [x] 6.2 Simplify `AuthContext` — remove permissions state, remove `hasPermission` helper
- [x] 6.3 Update login page — remove JWT login option, password-only
- [x] 6.4 Update any API calls that reference `trustLevel` to use `verification`

## 7. Documentation

- [x] 7.1 Rewrite the Trust & Verification guide — split into "Access Control" and "Verification" sections with scenario walkthroughs
- [x] 7.2 Update the Policies API page — reflect new `AccessPolicy` model (no permissions field)
- [x] 7.3 Update configuration and type definition reference pages for renamed fields
