## ADDED Requirements

### Requirement: Admin authentication via session cookie
Admin routes SHALL be protected by a middleware that reads the `dispatch_session` cookie, looks up the session in the database, and verifies the associated user is root. No JWT authentication is accepted on admin routes.

#### Scenario: Valid root session
- **WHEN** a request to an admin route includes a `dispatch_session` cookie with a valid, non-expired session belonging to a root user
- **THEN** the request is authorized and the handler receives the admin user's ID

#### Scenario: Non-root user session
- **WHEN** a session cookie belongs to a user with `isRoot: false`
- **THEN** the hub returns HTTP 403

#### Scenario: Missing or expired session
- **WHEN** no `dispatch_session` cookie is present, or the session is expired
- **THEN** the hub returns HTTP 401

#### Scenario: Bearer JWT on admin route
- **WHEN** a request to an admin route includes a Bearer JWT but no session cookie
- **THEN** the hub returns HTTP 401 (JWT is not accepted for admin routes)

### Requirement: Password-only login
The `POST /auth/login` endpoint SHALL accept only `{ username, password }` credentials. JWT-based login SHALL be removed.

#### Scenario: Successful password login
- **WHEN** `POST /auth/login` is called with valid root credentials
- **THEN** a session is created and the `dispatch_session` cookie is set

#### Scenario: JWT login rejected
- **WHEN** `POST /auth/login` is called with a Bearer JWT in the Authorization header (no username/password body)
- **THEN** the hub returns HTTP 400 or ignores the JWT and requires credentials

### Requirement: AdminSession identity type
The admin auth middleware SHALL produce an `AdminSession` type containing only `userId: string` and `isRoot: boolean`. No permissions array, no project scope, no JWT claims.

#### Scenario: Admin identity has no permissions
- **WHEN** a root user is authenticated via session
- **THEN** the route handler receives `{ userId: "root", isRoot: true }` — no `permissions` or `projects` fields exist
