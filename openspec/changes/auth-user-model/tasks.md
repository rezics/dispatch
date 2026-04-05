## 1. Database Schema

- [x] 1.1 Add `User` model to Prisma schema (`id`, `isRoot`, `createdAt`, `createdBy`)
- [x] 1.2 Add `Session` model to Prisma schema (`id`, `token` unique, `userId`, `expiresAt`, `createdAt`) with `expiresAt` index
- [x] 1.3 Add `TrustPolicy` model to Prisma schema (`id`, `issPattern`, `claimField`, `claimPattern`, `permissions`, `projectScope`, `createdBy`, `createdAt`)
- [x] 1.4 Run `prisma migrate dev` to generate migration
- [x] 1.5 Create seed script for initial root user (idempotent upsert)

## 2. Permissions Module

- [x] 2.1 Create `package/hub/src/auth/permissions.ts` with all permission constants (worker, dashboard, admin)
- [x] 2.2 Define `ResolvedIdentity` type in permissions module
- [x] 2.3 Implement `hasPermission` (exact match + wildcard + root bypass)
- [x] 2.4 Implement `hasAnyPermission` and `isProjectScoped` helpers

## 3. Identity Resolution

- [x] 3.1 Create `package/hub/src/auth/resolve.ts` with `resolveIdentity(claims, db)` function
- [x] 3.2 Implement issuer glob matching (convert `*.rezics.com` to regex, single-segment wildcard only)
- [x] 3.3 Implement claim field + regex matching against TrustPolicy rows
- [x] 3.4 Implement permission union and project scope resolution from matched policies
- [x] 3.5 Add in-memory policy cache with 30s TTL and manual invalidation

## 4. Auth Middleware Refactor

- [x] 4.1 Refactor `middleware.ts` to resolve `ResolvedIdentity` instead of `WorkerClaims`
- [x] 4.2 Add session cookie resolution path (check `Authorization` header first, then session cookie)
- [x] 4.3 Replace `workerClaims` context variable with `identity` across all route handlers
- [x] 4.4 Create `requirePermission(permission)` guard helper for route-level checks
- [x] 4.5 Update `claim.ts`, `audit.ts`, `ws/route.ts` to use permission-based guards

## 5. Auth API Endpoints

- [x] 5.1 Create `POST /auth/login` — verify JWT, resolve identity, create session, return token + cookie
- [x] 5.2 Create `POST /auth/logout` — delete session, clear cookie
- [x] 5.3 Add expired session cleanup to the Reaper loop

## 6. Policy API Endpoints

- [x] 6.1 Create `GET /policies` — list all trust policies (requires `admin:policies`)
- [x] 6.2 Create `POST /policies` — create trust policy with validation (requires `admin:policies`)
- [x] 6.3 Create `PATCH /policies/:id` — update policy (requires `admin:policies`)
- [x] 6.4 Create `DELETE /policies/:id` — delete policy (requires `admin:policies`)
- [x] 6.5 Invalidate policy cache on create/update/delete

## 7. User API Endpoints

- [x] 7.1 Create `GET /users` — list all users (requires `admin:users`)
- [x] 7.2 Create `POST /users` — create user; creating `isRoot: true` requires the caller to also be root

## 8. Dashboard Auth

- [x] 8.1 Add login page to hub-dashboard frontend
- [x] 8.2 Add auth state management (store session token, attach to API requests)
- [x] 8.3 Add auth guard to dashboard routes (redirect to login if unauthenticated)
- [x] 8.4 Add Policies management page (table + create/edit/delete forms)
- [x] 8.5 Add Users management page (table + create form)
- [x] 8.6 Update navigation to conditionally show Policies/Users based on permissions

## 9. Cleanup and Verification

- [x] 9.1 Remove old `WorkerClaims` type and `enforceCapabilities` function
- [x] 9.2 Run Biome to fix all type errors and lint issues
- [x] 9.3 Verify all existing worker auth flows still work with the new permission model
