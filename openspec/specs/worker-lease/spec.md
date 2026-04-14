## ADDED Requirements

### Requirement: HTTP Lease poll loop
The worker in HTTP continuous mode SHALL continuously poll the hub via `POST /tasks/claim` with configured `count` and `lease` duration. When no tasks are returned, the worker SHALL sleep for a configurable `pollInterval` (default 5s) before retrying.

#### Scenario: Tasks available
- **WHEN** the worker polls and the hub returns 3 tasks
- **THEN** all 3 tasks are dispatched to their matching plugin handlers concurrently

#### Scenario: No tasks available
- **WHEN** the worker polls and the hub returns `{ tasks: [], count: 0 }`
- **THEN** the worker sleeps for `pollInterval` before the next poll

### Requirement: Concurrent execution with concurrency limit
The worker SHALL execute at most `concurrency` tasks simultaneously. If the worker has capacity for fewer tasks than its configured `count`, it SHALL claim only as many as its remaining capacity allows.

#### Scenario: At capacity
- **WHEN** `concurrency: 20` and 18 tasks are running
- **THEN** the next claim requests `count: 2` (remaining capacity)

#### Scenario: Fully saturated
- **WHEN** all concurrency slots are occupied
- **THEN** the worker defers the next poll until at least one slot frees

### Requirement: Batch completion submission
After executing all claimed tasks (or when the batch is fully processed), the worker SHALL submit results via `POST /tasks/complete` with `done` and `failed` arrays.

#### Scenario: Mixed results
- **WHEN** 3 of 5 tasks succeed and 2 fail
- **THEN** the worker submits `done` with 3 entries and `failed` with 2 entries in a single request

### Requirement: Partial completion during long batches
The worker SHALL support submitting partial completions for tasks that finish before the full batch completes, to free hub resources early.

#### Scenario: Partial submission
- **WHEN** 10 tasks were claimed and 5 have finished while 5 are still running
- **THEN** the worker MAY submit the 5 completed results immediately without waiting for the remaining 5

### Requirement: Graceful shutdown
On `stop()` being called, the worker SHALL stop claiming new tasks, wait for in-flight tasks to complete (up to a configurable `shutdownTimeout`, default 30s), submit final results, and then resolve. The worker SHALL NOT register signal handlers or call `process.exit()` — signal handling is the consuming application's responsibility.

#### Scenario: Graceful stop
- **WHEN** `worker.stop()` is called while 3 tasks are running
- **THEN** no new claims are made, the 3 tasks finish, results are submitted, and the `stop()` promise resolves

#### Scenario: Shutdown timeout exceeded
- **WHEN** `worker.stop()` is called and in-flight tasks do not complete within `shutdownTimeout`
- **THEN** the worker submits results for completed tasks, logs a warning for unfinished tasks, and resolves
