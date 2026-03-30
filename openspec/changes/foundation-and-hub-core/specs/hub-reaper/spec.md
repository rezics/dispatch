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
