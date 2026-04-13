## Context

The hub currently requires all dashboard authentication to go through JWT verification against external JWKS providers. The root user is seeded with only an `id` and `isRoot: true`, with no local credentials. This means you cannot log into the dashboard without first configuring an external identity provider. Additionally, the JWT login flow upserts new users into the `User` table, which was never intended — the dashboard is single-user (root only).

## Goals / Non-Goals

**Goals:**
- Root user can log into the dashboard with username + password, no external IdP required
- JWT-based login remains as an alternative path (for environments with an IdP)
- User table is root-only — no new users created through login flows
- Seed script generates a secure random password and prints it on first run

**Non-Goals:**
- Multi-user dashboard support
- Password reset flow or email-based recovery
- OAuth/OIDC integration for dashboard login
- Changing how TrustPolicy or worker JWT auth works

## Decisions

### 1. Use `Bun.password` for hashing

**Choice**: Use Bun's built-in `Bun.password.hash()` / `Bun.password.verify()` (argon2id by default).

**Alternatives considered**:
- `bcryptjs`: Works everywhere but slower in Bun, adds a dependency.
- `@node-rs/argon2`: Fast native binding but adds a native dependency.

**Rationale**: Zero-dependency, uses argon2id by default, already available in the runtime.

### 2. Dual-path login on single endpoint

**Choice**: `POST /auth/login` detects the auth method — if `Authorization: Bearer <token>` is present, use JWT path; otherwise parse JSON body `{ username, password }` for password path. Both paths create the same session + cookie.

**Alternatives considered**:
- Separate endpoints (`/auth/login/password`, `/auth/login/token`): Unnecessary split, complicates the client.
- Password-only (remove JWT login): Loses flexibility for environments with an IdP.

**Rationale**: Single endpoint, two input methods, same output (session cookie). The detection is unambiguous: Bearer header present → JWT, otherwise → password.

### 3. Remove user upsert from JWT login

**Choice**: JWT login looks up the user by `sub` — if the user doesn't exist or isn't root, reject with 403. No upsert.

**Rationale**: The User table is root-only. JWT login should verify an existing root user, not create new users.

### 4. Password stored as `passwordHash` on `User` model

**Choice**: Add `passwordHash String?` to the existing `User` model. Optional because the field is only meaningful for password-based login.

**Rationale**: Minimal schema change, works with existing model.

### 5. Seed generates password, prints to console

**Choice**: `prisma/seed.ts` generates a 24-character random password, hashes it with `Bun.password.hash()`, upserts the root user with the hash, and prints the plaintext to stdout. Re-running seed rotates the password.

**Rationale**: Simple, no interactive setup needed, works in CI/Docker contexts. Re-running seed doubles as a password reset mechanism.

### 6. Login identifies root by `id` field, not a separate `username`

**Choice**: The login `username` field is matched against `User.id`. The root user's ID defaults to `rezics-root-001` (or `DISPATCH_ROOT_USER_ID` env var).

**Rationale**: The root user already has a well-known ID. Using it as the login identifier avoids adding a column.

### 7. Fail-fast validation order

**Choice**: Both login paths and the auth middleware SHALL validate in cheapest-check-first order, returning immediately on the first failure. No expensive work (DB queries, password hashing, JWT verification) happens if a cheaper check can reject first.

**Password login order**:
1. Check body has `username` + `password` (zero-cost parse check)
2. DB lookup by `username` → `User.id` (single indexed query)
3. Reject if user not found or `!isRoot` or `!passwordHash` (before touching argon2)
4. `Bun.password.verify()` (expensive — only reached for valid root user)

**JWT login order**:
1. Check Bearer token present (header parse)
2. Verify JWT signature + expiry (crypto — unavoidable, but fails fast on malformed tokens)
3. DB lookup by `sub` → `User.id`
4. Reject if user not found or `!isRoot`

**Session middleware order**:
1. Check Bearer token → JWT verify path (existing, no change)
2. Check session cookie present (header parse)
3. DB lookup session by token (single indexed query)
4. Reject if expired (compare dates — no further queries)
5. Reject if `!user.isRoot` for session users

**Rationale**: Argon2 verification and JWT crypto are the most expensive operations. Guarding them behind cheap checks (missing fields, user existence, root status) prevents wasted compute on invalid requests. This also keeps code flat — early returns instead of nested conditions.

## Risks / Trade-offs

- **[Password in seed output]** → The plaintext password is printed to stdout during seeding. Mitigation: Standard practice for self-hosted tools. Re-running seed rotates the password.
- **[No password reset UI]** → If the operator loses the password, they must re-run `prisma db seed`. Mitigation: Acceptable for a single-user admin system.
- **[JWT login restricted]** → JWT login no longer creates users, only works for existing root. Mitigation: This is the intended change — the User table should not grow from login flows.
