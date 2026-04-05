## Why

Dispatch currently has no user model, no dashboard authentication, and no way to map external identity claims to internal permissions. The auth middleware only understands `scope: "worker"` and the dashboard is wide open. To support a superuser who can operate the dashboard and configure trust policies for the Rezics auth service, dispatch needs a permission system that maps external JWT claims (issuer, role) to fine-grained internal permissions covering both worker and dashboard operations.

## What Changes

- Add a `User` table with a root user concept and a `Session` table for dashboard authentication
- Add a `TrustPolicy` table that maps external JWT claims (by issuer pattern, claim field, regex match) to granted permissions
- Create a `permissions.ts` module as the single source of truth for all permission strings (worker, dashboard, admin) and permission-checking helpers
- Refactor the auth middleware to resolve a unified identity (with permissions) from JWT claims by checking the User table and matching TrustPolicy rows, replacing the hard-coded `scope === 'worker'` check
- Add dashboard authentication supporting both `Authorization: Bearer <token>` header and session-based auth
- Add dashboard API routes for managing trust policies (CRUD) and users, guarded by admin permissions

## Capabilities

### New Capabilities

- `auth-permissions`: Permission catalog (`permissions.ts`) defining all permission strings (worker, dashboard, admin) and helper functions (`hasPermission`, `hasAnyPermission`, `isProjectScoped`)
- `auth-trust-policy`: TrustPolicy model and CRUD API for mapping external JWT claims to internal permissions via issuer glob, claim field, and regex matching
- `auth-user`: User model (with root flag), Session model, and session-based dashboard authentication alongside Bearer token support
- `auth-identity-resolver`: Identity resolution pipeline that checks User table for root status, then matches TrustPolicy rows, and returns a unified `ResolvedIdentity` with permissions

### Modified Capabilities

- `hub-auth`: Refactor middleware from hard-coded `scope === 'worker'` to permission-based checks using the resolved identity
- `hub-database`: Add User, Session, and TrustPolicy models to Prisma schema
- `hub-dashboard`: Add authentication requirement and policy management pages

## Impact

- **Database**: New Prisma models `User`, `Session`, `TrustPolicy` with migration
- **Auth middleware**: Breaking refactor from `WorkerClaims` to `ResolvedIdentity` across all guarded routes
- **Dashboard**: Now requires authentication; new pages for policy and user management
- **API**: New `/policies` and `/users` REST endpoints; existing worker endpoints change from scope-check to permission-check
- **Packages affected**: `hub` (middleware, routes, schema), `hub-dashboard` (auth flow, new pages), `type` (shared permission types)
