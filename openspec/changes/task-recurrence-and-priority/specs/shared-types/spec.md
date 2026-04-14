## MODIFIED Requirements

### Requirement: Task type definitions
The system SHALL export a `Task` interface with fields: `id` (UUID string), `project` (string), `type` (string, maps to capability), `payload` (unknown), `basePriority` (number 0–1000), `priority` (number 0–1000, effective/aged value), `status` (TaskStatus), `workerId` (string | null), `attempts` (number), `maxAttempts` (number), `recurrenceInterval` (number | null, seconds), `recurrenceJitter` (number | null, seconds), `scheduledAt` (Date), `startedAt` (Date | null), `leaseExpiresAt` (Date | null), `maxHoldExpiresAt` (Date | null), `finishedAt` (Date | null), `error` (string | null), `createdAt` (Date).

#### Scenario: Import Task type
- **WHEN** a consumer imports `Task` from `@rezics/dispatch-type`
- **THEN** the type includes all specified fields including `basePriority`, `recurrenceInterval`, and `recurrenceJitter`

#### Scenario: Priority range
- **WHEN** a task is created with `basePriority: 500`
- **THEN** the value is accepted (range 0–1000)
