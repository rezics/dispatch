## ADDED Requirements

### Requirement: Recurring task fields
The Task model SHALL support optional `recurrenceInterval` (integer, seconds) and `recurrenceJitter` (integer, seconds) fields. Both default to null. When `recurrenceInterval` is set, the task is considered recurring.

#### Scenario: One-shot task (default)
- **WHEN** a task is created without `recurrenceInterval`
- **THEN** `recurrenceInterval` and `recurrenceJitter` are null, and the task behaves as a standard one-shot task

#### Scenario: Recurring task creation
- **WHEN** a task is created with `recurrenceInterval: 86400` and `recurrenceJitter: 3600`
- **THEN** the task is stored with those values and is treated as recurring

### Requirement: Recurring task auto-reset on completion
When a task with `recurrenceInterval != null` is marked as done, the system SHALL immediately reset it to pending instead of leaving it in done status. The reset SHALL set: `status = 'pending'`, `scheduledAt = now + recurrenceInterval + random(0, recurrenceJitter ?? 0)`, `priority = basePriority`, `attempts = 0`, `workerId = null`, `leaseExpiresAt = null`, `maxHoldExpiresAt = null`, `startedAt = null`. The `finishedAt` field SHALL be set to the current time before the reset to record the last completion time.

#### Scenario: Recurring task completes and resets
- **WHEN** a recurring task with `recurrenceInterval: 86400` and `recurrenceJitter: 0` is marked done
- **THEN** the task is set to `status: "pending"`, `scheduledAt` is approximately `now + 86400s`, `priority` equals `basePriority`, `attempts` is 0, and `finishedAt` records the completion time

#### Scenario: Recurring task with jitter
- **WHEN** a recurring task with `recurrenceInterval: 86400` and `recurrenceJitter: 3600` is marked done
- **THEN** `scheduledAt` is set to `now + 86400 + random(0, 3600)` seconds, where the random offset varies per reset

#### Scenario: Recurring task failure does not trigger reset
- **WHEN** a recurring task exhausts `maxAttempts` and transitions to `failed`
- **THEN** the task remains in `failed` status and is NOT automatically reset

### Requirement: Result plugin runs before recurrence reset
For recurring tasks, the result plugin runner SHALL be invoked with the task's result BEFORE the recurrence reset occurs. The `TaskResult` data is preserved across recurrence cycles.

#### Scenario: Store result persists across cycles
- **WHEN** a recurring task completes with `result: { strategy: "store", data: { lastUpdated: "2026-04-14" } }`
- **THEN** the result plugin stores/upserts the data, and THEN the task resets to pending
