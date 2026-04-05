## 1. Schema & Migration

- [x] 1.1 Add `passwordHash String?` field to `User` model in `prisma/schema.prisma`
- [x] 1.2 Run `prisma migrate dev` to generate and apply the migration

## 2. Seed Script

- [x] 2.1 Update `prisma/seed.ts` to generate a 24-char random password, hash with `Bun.password.hash()`, upsert root user with `passwordHash`, and print plaintext to stdout

## 3. Login Endpoint

- [x] 3.1 Add password-based login path to `POST /auth/login` in `src/api/auth.ts`: accept `{ username, password }` JSON body, look up user by `username` → `User.id`, verify with `Bun.password.verify()`
- [x] 3.2 Add login method detection: Bearer token header → JWT path, otherwise → password path
- [x] 3.3 Restrict both login paths to root users only — remove the user upsert from the JWT path, reject non-root/unknown users with 403

## 4. Auth Middleware Cleanup

- [x] 4.1 Remove `TrustPolicy`-based permission resolution for session users in `src/auth/middleware.ts` — root session always gets `['*']`, non-root sessions are not expected

## 5. Tests

- [x] 5.1 Update `test/e2e/auth.test.ts` to cover password-based login (success, wrong password 401, unknown user 401, non-root user 403)
- [x] 5.2 Verify JWT login still works for root but rejects unknown/non-root users without upserting
