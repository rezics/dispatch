## ADDED Requirements

### Requirement: WS handler at /workers endpoint
The hub SHALL handle WebSocket upgrades at `/workers` via Elysia's WS support. The upgrade is authenticated via Bearer JWT. After upgrade, the hub processes the WS message protocol (register, heartbeat, task:done, task:fail, task:progress).

#### Scenario: WS upgrade authenticated
- **WHEN** a WS upgrade arrives at `/workers` with a valid JWT
- **THEN** the connection is upgraded and the hub awaits messages

#### Scenario: WS messages processed
- **WHEN** a connected worker sends `{ type: 'task:done', taskId: 't1', result: { strategy: 'discard' } }`
- **THEN** the hub processes it identically to an HTTP completion

### Requirement: POST /tasks/audit endpoint
The hub SHALL expose `POST /tasks/audit` accepting `{ taskIds, project, signature }`. This endpoint is used by Main Servers to directly confirm task completion for projects with `verification: "audited"`. The signature is verified using the project's `receipt_secret`. This endpoint requires no JWT or session auth (it uses signature verification).

#### Scenario: Valid audit request
- **WHEN** `POST /tasks/audit { "taskIds": ["t1"], "project": "crawl", "signature": "valid-hmac" }` is received with a valid signature
- **THEN** HTTP 200 and tasks are marked `done`

#### Scenario: Invalid audit signature
- **WHEN** `POST /tasks/audit` is called with an invalid signature
- **THEN** HTTP 403 with signature verification error

#### Scenario: Audit for non-audited project
- **WHEN** `POST /tasks/audit` is called for a project with `verification: "none"`
- **THEN** HTTP 400 indicating this endpoint is only for audited projects

### Requirement: Project mutation requires admin auth
`POST /projects` and `PATCH /projects/:id` SHALL require admin authentication (root user via session cookie). `GET /projects` and `GET /projects/:id/stats` remain publicly accessible.

#### Scenario: Unauthenticated project creation rejected
- **WHEN** `POST /projects` is called without a session cookie
- **THEN** HTTP 401

#### Scenario: Root user creates project
- **WHEN** `POST /projects` is called with a valid root session cookie
- **THEN** the project is created and returned

### Requirement: Worker deletion requires admin auth
`DELETE /workers/:id` SHALL require admin authentication (root user via session cookie). `GET /workers` and `GET /workers/:id` remain publicly accessible.

#### Scenario: Unauthenticated worker deletion rejected
- **WHEN** `DELETE /workers/:id` is called without a session cookie
- **THEN** HTTP 401

#### Scenario: Root user deletes worker
- **WHEN** `DELETE /workers/:id` is called with a valid root session cookie
- **THEN** the worker is disconnected and removed

## MODIFIED Requirements

### Requirement: POST /tasks/complete submits results
The hub SHALL expose `POST /tasks/complete` accepting `{ done, failed, receipt? }` arrays. This endpoint requires worker authentication (JWT with project access). For projects with `verification = 'receipted'`, the `receipt` field is required and MUST contain a valid `CompletionReceipt`. For `verification = 'none'`, the receipt is optional and ignored. For `verification = 'audited'`, workers SHALL NOT use this endpoint (they submit to the Main Server instead).

#### Scenario: Mixed completion (no verification)
- **WHEN** a worker submits `{ "done": [{ "id": "t1", "result": { "strategy": "discard" } }], "failed": [{ "id": "t2", "error": "timeout", "retryable": true }] }` for a project with `verification: "none"`
- **THEN** HTTP 200, t1 marked done, t2 retried or failed based on attempts

#### Scenario: Receipted completion with valid receipt
- **WHEN** a worker submits completion with a valid receipt for a `receipted` project
- **THEN** HTTP 200, receipt is verified, tasks are marked done

#### Scenario: Receipted completion without receipt
- **WHEN** a worker submits completion without a receipt for a `receipted` project
- **THEN** HTTP 400 with error indicating receipt is required

#### Scenario: Done tasks routed through result plugin runner
- **WHEN** a task is completed with `{ strategy: 'store', data: {...} }`
- **THEN** the store result plugin is invoked after the task is marked done
