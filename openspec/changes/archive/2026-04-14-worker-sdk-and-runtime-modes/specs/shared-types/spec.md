## ADDED Requirements

### Requirement: SingleRunConfig type
The system SHALL export a `SingleRunConfig` type with fields: `timeout` (number, required), `claimCount` (number, optional).

#### Scenario: Import SingleRunConfig type
- **WHEN** a consumer imports `SingleRunConfig` from `@rezics/dispatch-type`
- **THEN** the type includes `timeout: number` and optional `claimCount?: number`

### Requirement: WorkerStatus type
The system SHALL export a `WorkerStatus` type with fields: `mode` (`'http' | 'ws' | 'single-run'`), `connected` (boolean), `uptime` (number, milliseconds), `counts` (`{ active: number; completed: number; failed: number }`).

#### Scenario: Import WorkerStatus type
- **WHEN** a consumer imports `WorkerStatus` from `@rezics/dispatch-type`
- **THEN** the type includes all specified fields

### Requirement: ActiveTaskInfo type
The system SHALL export an `ActiveTaskInfo` type with fields: `taskId` (string), `type` (string), `startedAt` (Date), `progress` (number | null).

#### Scenario: Import ActiveTaskInfo type
- **WHEN** a consumer imports `ActiveTaskInfo` from `@rezics/dispatch-type`
- **THEN** the type includes all specified fields

## MODIFIED Requirements

### Requirement: Task type definitions
The system SHALL export a `Task` interface with fields: `id` (UUID string), `project` (string), `type` (string, maps to capability), `payload` (unknown), `priority` (number 1-10), `status` (TaskStatus), `workerId` (string | null), `attempts` (number), `maxAttempts` (number), `scheduledAt` (Date), `startedAt` (Date | null), `leaseExpiresAt` (Date | null), `maxHoldExpiresAt` (Date | null), `finishedAt` (Date | null), `error` (string | null), `createdAt` (Date).

#### Scenario: Import Task type
- **WHEN** a consumer imports `Task` from `@rezics/dispatch-type`
- **THEN** the type includes all specified fields including `maxHoldExpiresAt`
