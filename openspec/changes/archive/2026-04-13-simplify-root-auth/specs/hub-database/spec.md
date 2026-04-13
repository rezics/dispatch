## MODIFIED Requirements

### Requirement: Prisma schema defines user table
The Prisma schema SHALL define a `User` model with fields: `id` (String, @id), `isRoot` (Boolean, default false), `passwordHash` (String, optional), `createdAt` (DateTime, default now), `createdBy` (String, optional).

#### Scenario: Root user with password hash
- **WHEN** the root user is created via seed with a password hash
- **THEN** the user record has `isRoot: true` and a non-null `passwordHash`

#### Scenario: Non-root user without password
- **WHEN** a non-root user exists (e.g., from prior JWT-based upsert)
- **THEN** the user record has `passwordHash: null` and login via password is not possible
