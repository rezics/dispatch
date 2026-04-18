## 1. Database Changes

- [ ] 1.1 Remove `AccessPolicy` model (mapped as `TrustPolicy`) from `schema.prisma`
- [ ] 1.2 Create migration to drop `TrustPolicy` table
- [ ] 1.3 Remove `UsedNonce` relation from Project if no longer needed (check: only used by receipt system — keep if receipt system stays)

## 2. Remove Global Auth Provider Config

- [ ] 2.1 Remove `DISPATCH_AUTH_JWKS_URI`, `DISPATCH_AUTH_ISSUER`, `DISPATCH_AUTH_AUDIENCE` from `env.ts`
- [ ] 2.2 Remove `AuthProvider` interface and `authProviders` array from `src/auth/jwt.ts`
- [ ] 2.3 Remove auth provider startup logging

## 3. Simplify Worker Auth Middleware

- [ ] 3.1 Rewrite `workerAuth` middleware: extract project from request body, look up `project.jwksUri`, verify JWT against it
- [ ] 3.2 Update `WorkerIdentity` type from `{ sub, projects: string[] | '*' }` to `{ sub, project: string }`
- [ ] 3.3 Update `requireProjectAccess` to simple equality check (or inline it)
- [ ] 3.4 Keep JWKS cache map (`jose.createRemoteJWKSet` per URI)

## 4. Remove Access Policy System

- [ ] 4.1 Delete `src/auth/resolve.ts` (policy resolution + cache)
- [ ] 4.2 Delete `src/api/policies.ts` (CRUD endpoints)
- [ ] 4.3 Remove policy routes from the Elysia app
- [ ] 4.4 Remove policy seeding from `prisma/seed.ts`

## 5. Update Consumers

- [ ] 5.1 Update `src/api/claim.ts` — adapt to new `WorkerIdentity` shape
- [ ] 5.2 Update `src/ws/route.ts` — adapt WebSocket worker auth if it uses policies
- [ ] 5.3 Update any imports referencing removed modules
- [ ] 5.4 Regenerate prismabox types (`prisma generate`)

## 6. Verify

- [ ] 6.1 Run type check (`tsc --noEmit` or `bun check`)
- [ ] 6.2 Run existing tests
- [ ] 6.3 Verify project CRUD still works via API
