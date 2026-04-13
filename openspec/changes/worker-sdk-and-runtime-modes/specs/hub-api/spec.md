## ADDED Requirements

### Requirement: POST /workers/heartbeat endpoint
The hub SHALL expose `POST /workers/heartbeat` accepting `{ workerId: string }`. This endpoint requires worker authentication (JWT with valid project access). On success, the hub extends `leaseExpiresAt` for all tasks claimed by the given worker that have `status = 'running'`.

#### Scenario: Valid heartbeat
- **WHEN** `POST /workers/heartbeat { "workerId": "w1" }` is received with valid JWT
- **THEN** HTTP 200 with `{ extended: <count> }` and leases are extended

#### Scenario: Unauthenticated heartbeat
- **WHEN** `POST /workers/heartbeat` is called without a valid JWT
- **THEN** HTTP 401

### Requirement: Project maxTaskHoldTime field in API
The `POST /projects` and `PATCH /projects/:id` endpoints SHALL accept an optional `maxTaskHoldTime` field (positive integer in seconds, or null). `GET /projects/:id` SHALL include `maxTaskHoldTime` in the response.

#### Scenario: Create project with max hold time
- **WHEN** `POST /projects { "name": "crawl", "maxTaskHoldTime": 3600 }` is called by an admin
- **THEN** the project is created with `maxTaskHoldTime: 3600`

#### Scenario: Get project includes max hold time
- **WHEN** `GET /projects/:id` is called for a project with `maxTaskHoldTime: 3600`
- **THEN** the response includes `"maxTaskHoldTime": 3600`

### Requirement: Claim endpoint sets maxHoldExpiresAt
The `POST /tasks/claim` endpoint SHALL set `maxHoldExpiresAt = NOW() + project.maxTaskHoldTime` on each claimed task when the project has a non-null `maxTaskHoldTime`. When null, `maxHoldExpiresAt` SHALL remain null.

#### Scenario: Claim with max hold time
- **WHEN** tasks are claimed for a project with `maxTaskHoldTime: 3600`
- **THEN** each claimed task has `maxHoldExpiresAt` set to 1 hour from now

#### Scenario: Claim without max hold time
- **WHEN** tasks are claimed for a project with `maxTaskHoldTime: null`
- **THEN** each claimed task has `maxHoldExpiresAt = null`
