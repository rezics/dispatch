## MODIFIED Requirements

### Requirement: HTTP Lease poll loop
The worker in HTTP continuous mode SHALL continuously poll the hub via `POST /tasks/claim` with configured `count` and `lease` duration. When no tasks are returned, the worker SHALL sleep for a configurable `pollInterval` (default 5s) before retrying.

#### Scenario: Tasks available
- **WHEN** the worker polls and the hub returns 3 tasks
- **THEN** all 3 tasks are dispatched to their matching plugin handlers concurrently

#### Scenario: No tasks available
- **WHEN** the worker polls and the hub returns `{ tasks: [], count: 0 }`
- **THEN** the worker sleeps for `pollInterval` before the next poll

### Requirement: Graceful shutdown
On `stop()` being called, the worker SHALL stop claiming new tasks, wait for in-flight tasks to complete (up to a configurable `shutdownTimeout`, default 30s), submit final results, and then resolve. The worker SHALL NOT register signal handlers or call `process.exit()` — signal handling is the consuming application's responsibility.

#### Scenario: Graceful stop
- **WHEN** `worker.stop()` is called while 3 tasks are running
- **THEN** no new claims are made, the 3 tasks finish, results are submitted, and the `stop()` promise resolves

#### Scenario: Shutdown timeout exceeded
- **WHEN** `worker.stop()` is called and in-flight tasks do not complete within `shutdownTimeout`
- **THEN** the worker submits results for completed tasks, logs a warning for unfinished tasks, and resolves

## REMOVED Requirements

### Requirement: Automatic lease renewal at 70% elapsed time
**Reason**: Replaced by worker-level heartbeat mechanism. Per-task lease renewal is no longer used in HTTP mode. The worker-level heartbeat (`POST /workers/heartbeat`) extends all leases in a single request.
**Migration**: Workers use the heartbeat mechanism instead. Configure `heartbeatInterval` in worker config (default 60s).
