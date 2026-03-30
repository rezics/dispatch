## ADDED Requirements

### Requirement: POST /tasks/audit endpoint
The hub SHALL expose `POST /tasks/audit` accepting `{ taskIds, project, signature }`. This endpoint is used by Main Servers to directly confirm task completion for `audited` trust level projects. The signature is verified using the project's `receipt_secret`.

#### Scenario: Valid audit request
- **WHEN** `POST /tasks/audit { "taskIds": ["t1"], "project": "crawl", "signature": "valid-hmac" }` is received with a valid signature
- **THEN** HTTP 200 and tasks are marked `done`

#### Scenario: Invalid audit signature
- **WHEN** `POST /tasks/audit` is called with an invalid signature
- **THEN** HTTP 403 with signature verification error

#### Scenario: Audit for non-audited project
- **WHEN** `POST /tasks/audit` is called for a project with `trustLevel: 'full'`
- **THEN** HTTP 400 indicating this endpoint is only for audited projects

### Requirement: WS handler at /workers endpoint
The hub SHALL handle WebSocket upgrades at `/workers` via Elysia's WS support. The upgrade is authenticated via Bearer JWT. After upgrade, the hub processes the WS message protocol (register, heartbeat, task:done, task:fail, task:progress).

#### Scenario: WS upgrade authenticated
- **WHEN** a WS upgrade arrives at `/workers` with a valid JWT
- **THEN** the connection is upgraded and the hub awaits messages

#### Scenario: WS messages processed
- **WHEN** a connected worker sends `{ type: 'task:done', taskId: 't1', result: { strategy: 'discard' } }`
- **THEN** the hub processes it identically to an HTTP completion

## MODIFIED Requirements

### Requirement: POST /tasks/complete submits results
The hub SHALL expose `POST /tasks/complete` accepting `{ done, failed, receipt? }` arrays. For projects with `trustLevel = 'receipted'`, the `receipt` field is required and MUST contain a valid `CompletionReceipt`. For `trustLevel = 'full'`, the receipt is optional and ignored. For `trustLevel = 'audited'`, workers SHALL NOT use this endpoint (they submit to the Main Server instead).

#### Scenario: Mixed completion (full trust)
- **WHEN** a worker submits `{ "done": [{ "id": "t1", "result": { "strategy": "discard" } }], "failed": [{ "id": "t2", "error": "timeout", "retryable": true }] }` for a `full` trust project
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
