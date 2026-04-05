## MODIFIED Requirements

### Requirement: JWT-based dashboard session creation
The hub `POST /auth/login` SHALL continue to accept Bearer JWT tokens for session creation, but SHALL NOT upsert new users into the `User` table. It SHALL validate in fail-fast order: (1) verify JWT signature + expiry (reject malformed/expired tokens before any DB work), (2) DB lookup user by `sub` → `User.id`, (3) reject if not found or `!isRoot`. Only existing root users SHALL be allowed to create sessions via JWT.

#### Scenario: Root user logs in via JWT
- **WHEN** `POST /auth/login` is called with a valid Bearer JWT whose `sub` matches an existing root user
- **THEN** a session is created and the `dispatch_session` cookie is set

#### Scenario: Unknown user attempts JWT login
- **WHEN** `POST /auth/login` is called with a valid Bearer JWT whose `sub` does not match any existing user
- **THEN** the response status is 403 with `{ error: "Dashboard login requires root" }` and no user is created

#### Scenario: Non-root user attempts JWT login
- **WHEN** `POST /auth/login` is called with a valid Bearer JWT whose `sub` matches a non-root user
- **THEN** the response status is 403 with `{ error: "Dashboard login requires root" }`
