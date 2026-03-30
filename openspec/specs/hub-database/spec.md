## ADDED Requirements

### Requirement: Prisma schema defines project table
The Prisma schema SHALL define a `Project` model with fields: `id` (String, @id), `trustLevel` (String, default `"receipted"`), `receiptSecret` (String, optional), `jwksUri` (String, optional), `createdAt` (DateTime, default now).

#### Scenario: Project creation
- **WHEN** a project is created via Prisma client with `{ id: "book-crawler", trustLevel: "full" }`
- **THEN** the row is persisted with the given values and `createdAt` auto-set

### Requirement: Prisma schema defines worker table
The Prisma schema SHALL define a `Worker` model with fields: `id` (String, @id, from JWT sub), `project` (String, relation to Project), `capabilities` (String[]), `concurrency` (Int, default 10), `mode` (String), `metadata` (Json, optional), `connectedAt` (DateTime, default now), `lastSeen` (DateTime, default now).

#### Scenario: Worker registration persists
- **WHEN** a worker record is created with capabilities `["book:crawl"]` and mode `"http"`
- **THEN** the record is queryable by id with correct capabilities array

### Requirement: Prisma schema defines task table
The Prisma schema SHALL define a `Task` model with fields: `id` (String, @id, @default uuid), `project` (String, relation to Project), `type` (String), `payload` (Json), `priority` (Int, default 5), `status` (String, default `"pending"`), `workerId` (String, optional, relation to Worker), `attempts` (Int, default 0), `maxAttempts` (Int, default 3), `scheduledAt` (DateTime, default now), `startedAt` (DateTime, optional), `leaseExpiresAt` (DateTime, optional), `finishedAt` (DateTime, optional), `error` (String, optional), `createdAt` (DateTime, default now).

#### Scenario: Task creation with defaults
- **WHEN** a task is created with only `project`, `type`, and `payload`
- **THEN** it has `status: "pending"`, `priority: 5`, `attempts: 0`, `maxAttempts: 3`

### Requirement: Dispatch index for pending tasks
The database SHALL have an index on the task table covering `(project, priority DESC, scheduledAt ASC)` filtered to `status = 'pending'` for efficient dispatch queries.

#### Scenario: Dispatch query uses index
- **WHEN** a SKIP LOCKED query fetches pending tasks ordered by priority then scheduledAt
- **THEN** the query plan uses the dispatch index rather than a sequential scan

### Requirement: Reaper index for expired leases
The database SHALL have an index on `leaseExpiresAt` filtered to `status = 'running'` for the reaper to efficiently find expired tasks.

#### Scenario: Reaper query uses index
- **WHEN** the reaper queries for running tasks with `leaseExpiresAt < NOW()`
- **THEN** the query plan uses the reaper index

### Requirement: Prisma schema defines task_result table
The Prisma schema SHALL define a `TaskResult` model with fields: `taskId` (String, @id, relation to Task), `data` (Json), `createdAt` (DateTime, default now).

#### Scenario: Store result for task
- **WHEN** a task result is created with `taskId` and JSON data
- **THEN** it is retrievable by taskId

### Requirement: Prisma schema defines used_nonce table
The Prisma schema SHALL define a `UsedNonce` model with composite key `(nonce, project)` and an `expiresAt` (DateTime) field with an index for TTL cleanup.

#### Scenario: Nonce uniqueness enforced
- **WHEN** two records with the same `nonce` and `project` are inserted
- **THEN** the second insert fails with a unique constraint violation

### Requirement: Prisma schema defines result_plugin table
The Prisma schema SHALL define a `ResultPlugin` model with composite key `(id, project)`, `config` (Json), and `enabled` (Boolean, default true).

#### Scenario: Plugin config stored per project
- **WHEN** a result plugin config is created for project "book-crawler" with id "webhook"
- **THEN** it is queryable by the composite key `(id: "webhook", project: "book-crawler")`

### Requirement: Database migrations are managed by Prisma
All schema changes SHALL be applied via `prisma migrate dev` (development) and `prisma migrate deploy` (production). No manual SQL migration files.

#### Scenario: Initial migration
- **WHEN** `prisma migrate dev` is run against an empty database
- **THEN** all tables, indexes, and constraints are created successfully
