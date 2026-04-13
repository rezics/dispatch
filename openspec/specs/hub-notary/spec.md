## ADDED Requirements

### Requirement: Receipt field validation
The hub SHALL verify that the receipt's `taskIds` match the tasks being completed, `workerId` matches the JWT `sub`, `project` matches the JWT `project`, and the receipt has not expired (`expiresAt > now`).

#### Scenario: Mismatched taskIds
- **WHEN** a receipt claims taskIds `['t1', 't2']` but the completion body contains `['t1', 't3']`
- **THEN** the hub returns HTTP 400

#### Scenario: Expired receipt
- **WHEN** a receipt has `expiresAt` in the past
- **THEN** the hub returns HTTP 400 with an error indicating receipt has expired

### Requirement: Nonce anti-replay enforcement
The hub SHALL check that the receipt's `nonce` has not been previously used for the same project. After accepting a receipt, the nonce is stored in the `used_nonce` table with the receipt's `expiresAt`.

#### Scenario: First use of nonce accepted
- **WHEN** a receipt with `nonce: 'abc-123'` is submitted for the first time
- **THEN** the completion is accepted and the nonce is stored

#### Scenario: Replayed nonce rejected
- **WHEN** a receipt with `nonce: 'abc-123'` is submitted a second time (same project)
- **THEN** the hub returns HTTP 409 with an error indicating nonce already used

### Requirement: Signing utility for Main Servers
The `@rezics/dispatch-type` package SHALL export a `signReceipt(receipt, secret)` utility function that produces the HMAC-SHA256 signature for a `CompletionReceipt`. Main Servers use this to sign receipts for workers.

#### Scenario: Sign a receipt
- **WHEN** `signReceipt({ taskIds: ['t1'], workerId: 'w1', project: 'crawl', issuedAt: now, expiresAt: now+60s, nonce: 'uuid' }, secret)` is called
- **THEN** the function returns the receipt with a valid `signature` field

### Requirement: POST /tasks/audit for audited trust
The hub SHALL expose `POST /tasks/audit` accepting `{ taskIds, project, signature }` signed by the Main Server. This endpoint marks tasks as done without worker involvement in the completion step.

#### Scenario: Audit completion
- **WHEN** a Main Server calls `POST /tasks/audit { taskIds: ['t1', 't2'], project: 'crawl', signature: '...' }` with a valid signature
- **THEN** tasks t1 and t2 are marked `done`

#### Scenario: Audit with invalid signature
- **WHEN** `POST /tasks/audit` is called with an invalid signature
- **THEN** the hub returns HTTP 403

## MODIFIED Requirements

### Requirement: Receipt verification for receipted trust
When a project has `verification = 'receipted'`, the hub SHALL require a valid `CompletionReceipt` in the `/tasks/complete` request body. The hub verifies the receipt's HMAC-SHA256 signature using the project's `receipt_secret`.

#### Scenario: Valid receipt accepted
- **WHEN** a worker submits `/tasks/complete` with a correctly signed receipt for a `receipted` project
- **THEN** the completion is processed normally

#### Scenario: Missing receipt rejected
- **WHEN** a worker submits `/tasks/complete` without a receipt for a `receipted` project
- **THEN** the hub returns HTTP 400 with an error indicating receipt is required

#### Scenario: Invalid signature rejected
- **WHEN** a receipt has an incorrect HMAC signature
- **THEN** the hub returns HTTP 403 with an error indicating signature verification failed

### Requirement: Full trust skips receipt verification
When a project has `verification = 'none'`, the hub SHALL accept completions without any receipt or signature. The `receipt` field in the request body is ignored.

#### Scenario: No-verification completion
- **WHEN** a worker submits `/tasks/complete` without a receipt for a project with `verification: "none"`
- **THEN** the completion is processed normally without verification

## RENAMED Requirements

### Requirement: Receipt verification for receipted trust
- **FROM:** References to `trustLevel` in receipt enforcement logic
- **TO:** References to `verification` (field name on Project model)

### Requirement: Full trust skips receipt verification
- **FROM:** `trustLevel = 'full'`
- **TO:** `verification = 'none'`
