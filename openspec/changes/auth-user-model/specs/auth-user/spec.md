## ADDED Requirements

### Requirement: User model
The system SHALL store users in a `User` database table with fields: `id` (String, @id — matches the JWT `sub` claim), `isRoot` (Boolean, default false), `createdAt` (DateTime), `createdBy` (String, nullable — sub of the user who created this entry, null for seed user).

#### Scenario: Root user exists
- **WHEN** a root user is seeded with `id: "rezics-root-001"` and `isRoot: true`
- **THEN** the user is queryable by ID and has `isRoot: true`

### Requirement: Session model
The system SHALL store sessions in a `Session` database table with fields: `id` (String, auto-generated UUID), `token` (String, unique, cryptographically random), `userId` (String, relation to User), `expiresAt` (DateTime), `createdAt` (DateTime).

#### Scenario: Session created on login
- **WHEN** a valid JWT is presented to `POST /auth/login` and the resolved identity has dashboard permissions
- **THEN** a new Session row is created with a random token and expiry

#### Scenario: Expired session rejected
- **WHEN** a request includes a session cookie with an expired session
- **THEN** the hub returns HTTP 401

### Requirement: Login endpoint
The hub SHALL expose `POST /auth/login` which accepts a JWT (via `Authorization: Bearer` header), verifies it, resolves the identity, and if the identity has any `dashboard:*` permission, creates a session and returns the session token in both a `Set-Cookie` header (`HttpOnly`, `SameSite=Strict`, `Secure` in production) and the response body.

#### Scenario: Successful login
- **WHEN** a valid JWT with `dashboard:view` permission is sent to `POST /auth/login`
- **THEN** the response includes a session token cookie and JSON body `{ token, expiresAt }`

#### Scenario: Login without dashboard permissions
- **WHEN** a valid JWT with only `worker:register` permission is sent to `POST /auth/login`
- **THEN** the hub returns HTTP 403

### Requirement: Logout endpoint
The hub SHALL expose `POST /auth/logout` which deletes the current session from the database and clears the session cookie.

#### Scenario: Successful logout
- **WHEN** an authenticated session sends `POST /auth/logout`
- **THEN** the session row is deleted and the cookie is cleared

### Requirement: Session cleanup
The hub SHALL periodically delete expired sessions. This MAY be handled by the existing Reaper loop.

#### Scenario: Expired sessions are cleaned up
- **WHEN** the reaper runs and sessions exist with `expiresAt` in the past
- **THEN** those session rows are deleted

### Requirement: User CRUD API
The hub SHALL expose `GET /users` (list) and `POST /users` (create) endpoints. Only users with `admin:users` permission SHALL access these endpoints. Creating a user with `isRoot: true` SHALL require the requesting user to also be a root user.

#### Scenario: List users
- **WHEN** an authenticated root user sends `GET /users`
- **THEN** all users are returned

#### Scenario: Create root user requires root
- **WHEN** a non-root user with `admin:users` permission sends `POST /users` with `isRoot: true`
- **THEN** the hub returns HTTP 403

#### Scenario: Create non-root user
- **WHEN** a user with `admin:users` permission sends `POST /users` with `isRoot: false`
- **THEN** the user is created successfully

### Requirement: Root user seed
The system SHALL provide a Prisma seed script that creates an initial root user. The seed script SHALL read the root user's `sub` from a seed configuration file or accept it as a CLI argument.

#### Scenario: Seed creates root user
- **WHEN** `bunx prisma db seed` is run with a configured root sub
- **THEN** a User row is created with `isRoot: true`

#### Scenario: Seed is idempotent
- **WHEN** the seed script is run twice with the same root sub
- **THEN** no error occurs and only one User row exists
