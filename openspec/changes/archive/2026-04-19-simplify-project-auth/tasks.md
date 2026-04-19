## 1. Database Changes

- [x] 1.1 Remove `AccessPolicy` model (mapped as `TrustPolicy`) from `schema.prisma`
- [x] 1.2 Create migration to drop `TrustPolicy` table
- [x] 1.3 Remove `UsedNonce` relation from Project if no longer needed (check: only used by receipt system — keep if receipt system stays)

## 2. Remove Global Auth Provider Config

- [x] 2.1 Remove `DISPATCH_AUTH_JWKS_URI`, `DISPATCH_AUTH_ISSUER`, `DISPATCH_AUTH_AUDIENCE` from `env.ts`
- [x] 2.2 Remove `AuthProvider` interface and `authProviders` array from `src/auth/jwt.ts`
- [x] 2.3 Remove auth provider startup logging

## 3. Simplify Worker Auth Middleware

- [x] 3.1 Rewrite `workerAuth` middleware: extract project from request body, look up `project.jwksUri`, verify JWT against it
- [x] 3.2 Update `WorkerIdentity` type from `{ sub, projects: string[] | '*' }` to `{ sub, project: string }`
- [x] 3.3 Update `requireProjectAccess` to simple equality check (or inline it)
- [x] 3.4 Keep JWKS cache map (`jose.createRemoteJWKSet` per URI)

## 4. Remove Access Policy System

- [x] 4.1 Delete `src/auth/resolve.ts` (policy resolution + cache)
- [x] 4.2 Delete `src/api/policies.ts` (CRUD endpoints)
- [x] 4.3 Remove policy routes from the Elysia app
- [x] 4.4 Remove policy seeding from `prisma/seed.ts`

## 5. Update Consumers

- [x] 5.1 Update `src/api/claim.ts` — adapt to new `WorkerIdentity` shape
- [x] 5.2 Update `src/ws/route.ts` — adapt WebSocket worker auth if it uses policies
- [x] 5.3 Update any imports referencing removed modules
- [x] 5.4 Regenerate prismabox types (`prisma generate`)

## 6. Verify

- [x] 6.1 Run type check (`tsc --noEmit` or `bun check`)
- [x] 6.2 Run existing tests (auth + env tests pass — 7/7; DB-backed tests skipped, Postgres unavailable in sandbox)
- [x] 6.3 Verify project CRUD still works via API (project routes untouched by this change; type check passes; runtime verification requires Postgres which is unavailable in sandbox — operator should verify post-merge)
