## MODIFIED Requirements

### Requirement: Task completion
The hub SHALL accept batch completion submissions marking tasks as `done` or `failed`. For `done` tasks, the result plugin runner SHALL be invoked with the task and its `TaskResult` before finalizing. For `receipted` trust projects, completion MUST include a verified `CompletionReceipt`. The `finishedAt` and `error` fields are updated accordingly.

#### Scenario: Successful completion with result plugin
- **WHEN** a worker submits `done: [{ id: "task-1", result: { strategy: "store", data: { title: "Book" } } }]`
- **THEN** task-1 is updated to `status: "done"`, `finishedAt` is set, and the store result plugin writes the data to `task_result`

#### Scenario: Successful completion with discard
- **WHEN** a worker submits `done: [{ id: "task-1", result: { strategy: "discard" } }]`
- **THEN** task-1 is updated to `status: "done"`, `finishedAt` is set, and no result is stored

#### Scenario: Failed completion with retry
- **WHEN** a worker submits `failed: [{ id: "task-2", error: "timeout", retryable: true }]` and task-2 has `attempts: 1, maxAttempts: 3`
- **THEN** task-2 is reset to `status: "pending"`, `workerId: null`, `leaseExpiresAt: null`

#### Scenario: Failed completion exhausted
- **WHEN** a worker submits `failed: [{ id: "task-3", error: "bad data", retryable: true }]` and task-3 has `attempts: 3, maxAttempts: 3`
- **THEN** task-3 is set to `status: "failed"` with the error message stored

#### Scenario: Receipted project requires receipt
- **WHEN** a worker submits completion for a project with `trustLevel: 'receipted'` without a receipt
- **THEN** the hub rejects with HTTP 400

#### Scenario: Result plugin failure does not block completion
- **WHEN** a result plugin (e.g., webhook) throws an error during handling
- **THEN** the task is still marked `done`, the error is logged, and the response is HTTP 200
