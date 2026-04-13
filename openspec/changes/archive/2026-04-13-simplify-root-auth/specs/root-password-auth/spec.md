## ADDED Requirements

### Requirement: Password-based login endpoint
The hub `POST /auth/login` SHALL accept a JSON body `{ username: string, password: string }`. It SHALL validate in fail-fast order: (1) check body fields present, (2) DB lookup user by `username` → `User.id`, (3) reject if not found or `!isRoot` or `!passwordHash` before any expensive work, (4) verify password with `Bun.password.verify()`. On success, create a session and set the `dispatch_session` cookie. Password verification (argon2) SHALL only be reached for a valid root user with a password hash.

#### Scenario: Successful root login
- **WHEN** `POST /auth/login` is called with `{ username: "rezics-root-001", password: "<correct-password>" }`
- **THEN** the response status is 200, a session is created in the database, and the `dispatch_session` cookie is set with HttpOnly, SameSite=Strict, and a 7-day expiry

#### Scenario: Wrong password
- **WHEN** `POST /auth/login` is called with a valid username but incorrect password
- **THEN** the response status is 401 with `{ error: "Invalid credentials" }`

#### Scenario: Unknown username
- **WHEN** `POST /auth/login` is called with a username that does not match any `User.id`
- **THEN** the response status is 401 with `{ error: "Invalid credentials" }` (same error as wrong password to prevent user enumeration)

#### Scenario: User without password hash
- **WHEN** `POST /auth/login` is called for a user that exists but has no `passwordHash`
- **THEN** the response status is 401 with `{ error: "Invalid credentials" }`

#### Scenario: Non-root user login rejected
- **WHEN** `POST /auth/login` is called with credentials for a non-root user
- **THEN** the response status is 403 with `{ error: "Dashboard login requires root" }`

### Requirement: Login method detection
The `POST /auth/login` endpoint SHALL detect the auth method by checking for a Bearer token in the `Authorization` header first, then falling back to JSON body `{ username, password }`. If neither is present, it SHALL return 401.

#### Scenario: Bearer token takes precedence
- **WHEN** `POST /auth/login` is called with both a Bearer token header and a JSON body
- **THEN** the Bearer token path is used

#### Scenario: No credentials provided
- **WHEN** `POST /auth/login` is called with no Bearer token and no JSON body
- **THEN** the response status is 401 with `{ error: "Missing credentials" }`

### Requirement: Seed generates root password
The seed script SHALL generate a cryptographically random 24-character password, hash it using `Bun.password.hash()`, upsert the root user with `isRoot: true` and the generated `passwordHash`, and print the plaintext password to stdout.

#### Scenario: First seed run
- **WHEN** `prisma db seed` is run against an empty database
- **THEN** the root user is created with a `passwordHash` and the plaintext password is printed to the console

#### Scenario: Re-running seed
- **WHEN** `prisma db seed` is run and the root user already exists
- **THEN** the root user's `passwordHash` is updated with a new random password, and the new password is printed to the console
