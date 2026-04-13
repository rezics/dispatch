## Why

The current auth model requires the root user to authenticate via an external JWT provider, creating a chicken-and-egg problem: you need an IdP configured before you can log into the dashboard to manage anything. Additionally, the JWT login flow upserts non-root users into the `User` table, which was never intended — the dashboard is single-user (root only). The root user needs a simple local password login as a primary auth method, while JWT-based login should remain available as an alternative.

## What Changes

- Add `passwordHash` field to the `User` model for local credential storage.
- Add a password-based login path to `POST /auth/login` accepting `{ username, password }` JSON body.
- Keep JWT-based login (Bearer token) as an alternative path on the same endpoint, but **remove the user upsert** — only existing root users can create sessions via JWT.
- The seed script will generate a random password for the root user on first run and print it to the console.
- The `User` table is root-only: no new users are created through login flows.
- Keep JWT auth (Bearer tokens) fully intact for all worker and API communication — no changes there.

## Capabilities

### New Capabilities
- `root-password-auth`: Local username-password authentication for the root dashboard user, including password hashing, session creation, and seed-time credential generation.

### Modified Capabilities
- `hub-auth`: Remove user upsert from JWT login flow. JWT-based session creation remains but is restricted to existing root users only. No new users are created via login.
- `hub-database`: Add `passwordHash` field to `User` model.

## Impact

- **Schema**: `User` model gains `passwordHash` (String, optional). Migration required.
- **API**: `POST /auth/login` accepts either `{ username, password }` JSON body or Bearer JWT. JWT path no longer upserts users — only root can create sessions.
- **Seed**: `prisma/seed.ts` must generate a password hash and print the plaintext password.
- **Auth middleware**: Session cookie path unchanged.
- **Dependencies**: Use Bun's built-in `Bun.password` for hashing (zero new deps).
- **No impact**: Worker JWT auth, TrustPolicy for API authorization, WebSocket auth — all unchanged.
