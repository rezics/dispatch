## ADDED Requirements

### Requirement: Prisma schema defines User table
The Prisma schema SHALL define a `User` model with fields: `id` (String, @id — matches JWT `sub`), `isRoot` (Boolean, default false), `createdAt` (DateTime, default now), `createdBy` (String, nullable).

#### Scenario: User creation
- **WHEN** a user is created via Prisma client with `{ id: "rezics-root-001", isRoot: true }`
- **THEN** the row is persisted with `createdAt` auto-set

### Requirement: Prisma schema defines Session table
The Prisma schema SHALL define a `Session` model with fields: `id` (String, @id, @default uuid), `token` (String, @unique), `userId` (String, relation to User), `expiresAt` (DateTime), `createdAt` (DateTime, default now). The table SHALL have an index on `expiresAt` for efficient cleanup.

#### Scenario: Session lookup by token
- **WHEN** a session is created and then queried by `token`
- **THEN** the session is found with its associated user

#### Scenario: Expired session index
- **WHEN** the reaper queries for sessions with `expiresAt < NOW()`
- **THEN** the query uses the `expiresAt` index

### Requirement: Prisma schema defines TrustPolicy table
The Prisma schema SHALL define a `TrustPolicy` model with fields: `id` (String, @id, @default uuid), `issPattern` (String), `claimField` (String), `claimPattern` (String), `permissions` (String[]), `projectScope` (String, nullable), `createdBy` (String), `createdAt` (DateTime, default now).

#### Scenario: Policy creation
- **WHEN** a trust policy is created with issuer pattern and claim matching rules
- **THEN** the row is persisted and queryable

#### Scenario: Policy lists all rows
- **WHEN** `findMany()` is called on the TrustPolicy model
- **THEN** all policy rows are returned for the identity resolver to match against
