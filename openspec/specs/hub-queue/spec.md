## MODIFIED Requirements

### Requirement: Task completion
The hub SHALL accept batch completion submissions marking tasks as `done` or `failed`. For `done` tasks, the result plugin runner SHALL be invoked with the task and its `TaskResult` before finalizing. For `receipted` trust projects, completion MUST include a verified `CompletionReceipt`. The `finishedAt` field is set to the current time. For recurring tasks (`recurrenceInterval != null`), after result plugin processing, the task SHALL be reset to `status: "pending"` with `scheduledAt = now + recurrenceInterval + random(0, recurrenceJitter ?? 0)`, `priority = basePriority`, `attempts = 0`, `workerId = null`, `leaseExpiresAt = null`, `maxHoldExpiresAt = null`, `startedAt = null`. For non-recurring tasks, `status` is set to `"done"`.

#### Scenario: Successful completion with result plugin
- **WHEN** a worker submits `done: [{ id: "task-1", result: { strategy: "store", data: { title: "Book" } } }]`
- **THEN** task-1 is updated to `status: "done"`, `finishedAt` is set, and the store result plugin writes the data to `task_result`

#### Scenario: Successful completion with discard
- **WHEN** a worker submits `done: [{ id: "task-1", result: { strategy: "discard" } }]`
- **THEN** task-1 is updated to `status: "done"`, `finishedAt` is set, and no result is stored

#### Scenario: Recurring task completion resets to pending
- **WHEN** a worker submits `done: [{ id: "task-1", result: { strategy: "discard" } }]` and task-1 has `recurrenceInterval: 86400`
- **THEN** the result plugin runs, `finishedAt` is set, then task-1 is reset to `status: "pending"` with `scheduledAt` approximately `now + 86400s` and `priority = basePriority`

#### Scenario: Failed completion with retry
- **WHEN** a worker submits `failed: [{ id: "task-2", error: "timeout", retryable: true }]` and task-2 has `attempts: 1, maxAttempts: 3`
- **THEN** task-2 is reset to `status: "pending"`, `workerId: null`, `leaseExpiresAt: null`

#### Scenario: Failed completion exhausted
- **WHEN** a worker submits `failed: [{ id: "task-3", error: "bad data", retryable: true }]` and task-3 has `attempts: 3, maxAttempts: 3`
- **THEN** task-3 is set to `status: "failed"` with the error message stored

#### Scenario: Recurring task failure exhausted stays failed
- **WHEN** a recurring task with `recurrenceInterval: 86400` exhausts max attempts
- **THEN** it is set to `status: "failed"` and does NOT auto-reset

#### Scenario: Receipted project requires receipt
- **WHEN** a worker submits completion for a project with `trustLevel: 'receipted'` without a receipt
- **THEN** the hub rejects with HTTP 400

#### Scenario: Result plugin failure does not block completion
- **WHEN** a result plugin (e.g., webhook) throws an error during handling
- **THEN** the task is still marked `done` (or reset if recurring), the error is logged, and the response is HTTP 200

## ADDED Requirements

### Requirement: HTTP claim supports type filtering
The HTTP claim endpoint SHALL accept an optional `type` parameter. When provided, only tasks matching that type are eligible for claiming. When omitted, all task types are eligible (current behavior).

#### Scenario: Claim with type filter
- **WHEN** a worker calls `POST /tasks/claim` with `{ project: "alpha", type: "email", count: 5, lease: "300s" }`
- **THEN** only pending tasks with `type: "email"` in project "alpha" are claimed

#### Scenario: Claim without type filter
- **WHEN** a worker calls `POST /tasks/claim` with `{ project: "alpha", count: 5, lease: "300s" }` (no type)
- **THEN** all pending tasks in project "alpha" are eligible regardless of type

#### Scenario: Claim with type filter but no matching tasks
- **WHEN** a worker claims with `type: "push"` but no pending tasks of that type exist
- **THEN** an empty array is returned
