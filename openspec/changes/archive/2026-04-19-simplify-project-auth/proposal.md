## Why

The current worker authorization model uses an AccessPolicy table to map JWT claims to project access via pattern matching (issuer glob + claim regex). This adds significant complexity — a separate API surface, a 30-second cache layer, and a multi-step resolution process — for flexibility that a single-user, root-managed system doesn't need. Projects are already created by root; worker auth should simply verify the JWT against the project's own JWKS endpoint.

## What Changes

- **BREAKING**: Remove the `AccessPolicy` (mapped as `TrustPolicy`) table and its CRUD API endpoints (`/policies`)
- **BREAKING**: Remove the `resolveWorkerAccess` function and policy-based project resolution
- **BREAKING**: Remove global `DISPATCH_AUTH_JWKS_URI`, `DISPATCH_AUTH_ISSUER`, `DISPATCH_AUTH_AUDIENCE` environment variables
- Simplify `workerAuth` middleware: worker requests specify a project, the middleware fetches the project's `jwksUri` and verifies the JWT against it
- Remove the `AuthProvider` abstraction and multi-provider verification loop
- Each project's `jwksUri` becomes the sole source of truth for worker authentication

## Capabilities

### New Capabilities

- `project-scoped-worker-auth`: Worker JWT verification uses the target project's own JWKS endpoint, replacing the global policy-based resolution

### Modified Capabilities

- `hub-worker-auth`: Auth middleware changes from policy-based resolution to project-scoped JWKS verification
- `hub-access-policy`: Removed entirely
- `hub-auth-provider-config`: Removed — no more global auth provider environment variables
- `hub-env`: Remove auth-related environment variables

## Impact

- **API**: `/policies` endpoints removed (breaking for any clients managing policies)
- **Database**: `TrustPolicy` table dropped via migration
- **Auth middleware**: `workerAuth` simplified — callers must include project in request
- **Config**: `DISPATCH_AUTH_JWKS_URI`, `DISPATCH_AUTH_ISSUER`, `DISPATCH_AUTH_AUDIENCE` env vars removed
- **Seed**: Policy seeding logic removed from `prisma/seed.ts`
