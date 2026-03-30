## ADDED Requirements

### Requirement: Task creation
The hub SHALL accept new tasks via the API and insert them into the task table with `status = 'pending'`.

#### Scenario: Single task creation
- **WHEN** a POST to `/tasks` includes `{ project: "crawl", type: "book:crawl", payload: { url: "..." } }`
- **THEN** a task row is created with `status: "pending"`, `priority: 5`, `attempts: 0` and the task is returned with its generated UUID

#### Scenario: Task with custom priority
- **WHEN** a POST to `/tasks` includes `priority: 9`
- **THEN** the task is created with `priority: 9`

### Requirement: Batch task claiming via SKIP LOCKED
The hub SHALL claim tasks using a `SELECT ... FOR UPDATE SKIP LOCKED` query that atomically selects up to N pending tasks for a project, sets them to `status = 'running'`, assigns the `workerId`, sets `lease_expires_at`, increments `attempts`, and returns the claimed tasks.

#### Scenario: Concurrent workers claim disjoint tasks
- **WHEN** two workers simultaneously claim 5 tasks each from 10 available pending tasks
- **THEN** each worker receives a disjoint set and no task is double-assigned

#### Scenario: Claim respects priority ordering
- **WHEN** pending tasks exist with priorities 3, 7, and 10
- **THEN** the claim returns tasks ordered by priority descending (10 first)

#### Scenario: Claim respects scheduled_at
- **WHEN** two pending tasks have equal priority but different `scheduledAt`
- **THEN** the earlier `scheduledAt` is claimed first

#### Scenario: Claim count limit
- **WHEN** a worker requests `count: 5` but only 3 tasks are pending
- **THEN** only 3 tasks are returned

### Requirement: Lease duration enforcement
Claimed tasks SHALL have `lease_expires_at` set to `NOW() + lease duration`. The maximum lease duration is 3600 seconds. The maximum claim count is 5000.

#### Scenario: Lease time set correctly
- **WHEN** a worker claims with `lease: "500s"`
- **THEN** each claimed task's `leaseExpiresAt` is approximately `now + 500s`

#### Scenario: Excessive lease rejected
- **WHEN** a worker claims with `lease: "7200s"`
- **THEN** the hub returns HTTP 400 with an error about exceeding maximum lease duration

### Requirement: Task completion
The hub SHALL accept batch completion submissions marking tasks as `done` or `failed`, updating `finishedAt` and `error` fields accordingly.

#### Scenario: Successful completion
- **WHEN** a worker submits `done: [{ id: "task-1", result: { strategy: "discard" } }]`
- **THEN** task-1 is updated to `status: "done"`, `finishedAt` is set

#### Scenario: Failed completion with retry
- **WHEN** a worker submits `failed: [{ id: "task-2", error: "timeout", retryable: true }]` and task-2 has `attempts: 1, maxAttempts: 3`
- **THEN** task-2 is reset to `status: "pending"`, `workerId: null`, `leaseExpiresAt: null`

#### Scenario: Failed completion exhausted
- **WHEN** a worker submits `failed: [{ id: "task-3", error: "bad data", retryable: true }]` and task-3 has `attempts: 3, maxAttempts: 3`
- **THEN** task-3 is set to `status: "failed"` with the error message stored

### Requirement: Lease renewal
The hub SHALL allow workers to extend the lease on their claimed tasks if the lease has not yet expired.

#### Scenario: Valid lease renewal
- **WHEN** a worker sends a lease renew for tasks whose leases have not expired with `extend: "300s"`
- **THEN** `leaseExpiresAt` is updated to `NOW() + 300s`

#### Scenario: Expired lease cannot be renewed
- **WHEN** a worker sends a lease renew for tasks whose leases have already expired
- **THEN** the hub returns HTTP 409 indicating the lease has expired

### Requirement: Project scoping
Workers SHALL only be able to claim and complete tasks belonging to their JWT-declared `project`. Cross-project access is forbidden.

#### Scenario: Cross-project claim rejected
- **WHEN** a worker with `project: "crawl"` attempts to claim tasks from project `"analytics"`
- **THEN** the hub returns HTTP 403
