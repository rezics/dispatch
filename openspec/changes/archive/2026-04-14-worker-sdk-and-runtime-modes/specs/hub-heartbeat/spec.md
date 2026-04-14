## ADDED Requirements

### Requirement: POST /workers/heartbeat endpoint
The hub SHALL expose `POST /workers/heartbeat` accepting `{ workerId: string }`. This endpoint requires worker authentication (JWT with valid project access). On success, the hub extends `leaseExpiresAt` for all tasks where `workerId` matches and `status = 'running'`.

#### Scenario: Valid heartbeat extends leases
- **WHEN** `POST /workers/heartbeat { "workerId": "w1" }` is received with valid JWT and worker w1 holds 100 running tasks
- **THEN** HTTP 200 with `{ extended: 100 }` and all 100 tasks have `leaseExpiresAt` updated to `NOW() + grace_period`

#### Scenario: Heartbeat with no active tasks
- **WHEN** `POST /workers/heartbeat { "workerId": "w1" }` is received but worker w1 holds no running tasks
- **THEN** HTTP 200 with `{ extended: 0 }`

#### Scenario: Unauthenticated heartbeat rejected
- **WHEN** `POST /workers/heartbeat` is called without a valid JWT
- **THEN** HTTP 401

### Requirement: Grace period derived from heartbeat interval
The hub SHALL calculate the lease extension as `heartbeatInterval * 3` where `heartbeatInterval` is reported by the worker at registration or claim time. This provides tolerance for up to 2 missed heartbeats before leases expire.

#### Scenario: Default grace period
- **WHEN** a worker with `heartbeatInterval: 60s` sends a heartbeat
- **THEN** task leases are extended by 180 seconds from now

#### Scenario: Shorter heartbeat interval
- **WHEN** a worker with `heartbeatInterval: 30s` sends a heartbeat
- **THEN** task leases are extended by 90 seconds from now

### Requirement: Max task hold time per project
The `Project` model SHALL include a `maxTaskHoldTime` field (integer, seconds, nullable). When not null, all tasks claimed for this project SHALL have a `maxHoldExpiresAt` value set at claim time to `NOW() + maxTaskHoldTime`.

#### Scenario: Max hold time set on project
- **WHEN** a project has `maxTaskHoldTime: 3600` and a worker claims 50 tasks
- **THEN** all 50 tasks have `maxHoldExpiresAt` set to 1 hour from claim time

#### Scenario: No max hold time (null)
- **WHEN** a project has `maxTaskHoldTime: null` and a worker claims tasks
- **THEN** tasks have `maxHoldExpiresAt = null` (no limit)

### Requirement: Max hold time not extended by heartbeat
Heartbeats SHALL extend `leaseExpiresAt` but SHALL NOT extend `maxHoldExpiresAt`. The max hold time is an absolute ceiling set at claim time.

#### Scenario: Heartbeat does not push max hold
- **WHEN** a task was claimed 55 minutes ago with `maxHoldExpiresAt` at 60 minutes, and a heartbeat arrives
- **THEN** `leaseExpiresAt` is extended but `maxHoldExpiresAt` remains at the original 60-minute mark

### Requirement: Reaper reclaims on max hold expiry
The reaper SHALL reclaim tasks where `maxHoldExpiresAt IS NOT NULL AND maxHoldExpiresAt < NOW()` regardless of whether the worker is still sending heartbeats. These tasks follow the same retry/fail logic as lease-expired tasks.

#### Scenario: Max hold exceeded while heartbeating
- **WHEN** a worker is still sending heartbeats but has held tasks past `maxHoldExpiresAt`
- **THEN** the reaper reclaims those tasks (reset to pending if retries remain, or fail)

#### Scenario: Max hold and lease both expired
- **WHEN** both `leaseExpiresAt` and `maxHoldExpiresAt` have passed
- **THEN** the reaper reclaims the tasks (same behavior as either condition alone)

### Requirement: Max hold time configurable via project API
The `maxTaskHoldTime` field SHALL be settable via `POST /projects` and `PATCH /projects/:id`. The value MUST be a positive integer (seconds) or null.

#### Scenario: Set max hold time on project creation
- **WHEN** `POST /projects { "name": "crawl", "maxTaskHoldTime": 7200 }` is called by an admin
- **THEN** the project is created with `maxTaskHoldTime: 7200`

#### Scenario: Update max hold time
- **WHEN** `PATCH /projects/:id { "maxTaskHoldTime": 3600 }` is called by an admin
- **THEN** the project's `maxTaskHoldTime` is updated to 3600 (existing claimed tasks are not retroactively updated)

#### Scenario: Remove max hold time
- **WHEN** `PATCH /projects/:id { "maxTaskHoldTime": null }` is called by an admin
- **THEN** the project's max hold limit is removed
