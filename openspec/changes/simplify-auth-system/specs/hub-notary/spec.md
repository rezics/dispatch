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
