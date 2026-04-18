## ADDED Requirements

### Requirement: Reaper runs on configurable interval
The hub SHALL run the reaper loop at a configurable interval (default 30 seconds) that checks for running tasks with expired leases.

#### Scenario: Default interval
- **WHEN** the hub starts with no reaper configuration override
- **THEN** the reaper runs every 30 seconds

#### Scenario: Custom interval
- **WHEN** the hub is configured with `reaper.interval: "10s"`
- **THEN** the reaper runs every 10 seconds

### Requirement: Reaper resets retryable expired tasks
The reaper SHALL reset tasks where `status = 'running'`, `leaseExpiresAt < NOW()`, and `attempts < maxAttempts` back to `status = 'pending'` with `workerId = null`, `leaseExpiresAt = null`, `startedAt = null`.

#### Scenario: Expired task with retries remaining
- **WHEN** a running task has `leaseExpiresAt` 1 minute in the past and `attempts: 1, maxAttempts: 3`
- **THEN** the reaper sets it to `status: "pending"` so another worker can claim it

### Requirement: Reaper fails exhausted expired tasks
The reaper SHALL set tasks where `status = 'running'`, `leaseExpiresAt < NOW()`, and `attempts >= maxAttempts` to `status = 'failed'`.

#### Scenario: Expired task with no retries left
- **WHEN** a running task has `leaseExpiresAt` in the past and `attempts: 3, maxAttempts: 3`
- **THEN** the reaper sets it to `status: "failed"`

### Requirement: Reaper cleans expired nonces
The reaper SHALL delete rows from the `used_nonce` table where `expiresAt < NOW()` to prevent unbounded growth.

#### Scenario: Old nonces purged
- **WHEN** the reaper runs and `used_nonce` contains entries with `expiresAt` 5 minutes in the past
- **THEN** those entries are deleted

### Requirement: Reaper reclaims tasks exceeding max hold time
The reaper SHALL reclaim tasks where `status = 'running'` AND `max_hold_expires_at IS NOT NULL` AND `max_hold_expires_at < NOW()`. These tasks follow the same retry/fail logic as lease-expired tasks: reset to `pending` if `attempts < maxAttempts`, set to `failed` if `attempts >= maxAttempts`.

#### Scenario: Max hold exceeded with retries remaining
- **WHEN** a running task has `maxHoldExpiresAt` 1 minute in the past and `attempts: 1, maxAttempts: 3`
- **THEN** the reaper sets it to `status: "pending"` with `workerId = null`

#### Scenario: Max hold exceeded with no retries
- **WHEN** a running task has `maxHoldExpiresAt` in the past and `attempts: 3, maxAttempts: 3`
- **THEN** the reaper sets it to `status: "failed"`

#### Scenario: Max hold not set (null)
- **WHEN** a running task has `maxHoldExpiresAt = null`
- **THEN** the reaper does not reclaim it based on max hold time (only lease expiry applies)

### Requirement: Aging sweeper runs on separate interval
The hub SHALL run a priority aging sweeper on a configurable interval (default 300 seconds), independent of the lease reaper loop. The sweeper SHALL be started alongside the reaper at hub startup and stopped on shutdown.

#### Scenario: Aging sweeper starts with hub
- **WHEN** the hub starts
- **THEN** both the lease reaper (30s default) and aging sweeper (300s default) begin running on their respective intervals

#### Scenario: Aging sweeper shutdown
- **WHEN** the hub shuts down
- **THEN** both the reaper and aging sweeper timers are cleared

### Requirement: Aging sweeper updates stale pending task priorities
The aging sweeper SHALL update `priority` for all pending tasks in projects where `agingRate` is not null. The effective priority is computed as `basePriority + FLOOR(agingRate * days_elapsed_since_scheduledAt)`, capped at the project's `agingMaxPriority`. Only tasks where the stored `priority` is less than the computed value SHALL be updated (diff-only).

#### Scenario: Bulk aging across projects
- **WHEN** the aging sweeper runs and project A has `agingRate: 1.0` with 100 stale pending tasks, and project B has `agingRate: null`
- **THEN** only project A's tasks are evaluated, and only those whose computed priority exceeds their stored priority are updated

#### Scenario: No writes when nothing changed
- **WHEN** the aging sweeper runs and all pending tasks already have `priority` equal to or greater than the computed value
- **THEN** zero rows are updated
