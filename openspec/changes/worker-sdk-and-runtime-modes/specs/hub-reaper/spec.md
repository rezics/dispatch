## ADDED Requirements

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
