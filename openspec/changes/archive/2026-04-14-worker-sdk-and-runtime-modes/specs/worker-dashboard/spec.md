## REMOVED Requirements

### Requirement: Local HTTP API for dashboard data
**Reason**: The worker SDK no longer bundles an HTTP server. The local API on port 45321 is removed. Worker status is exposed programmatically via methods on the worker object (`status()`, `activeTasks()`). Consuming applications that need a dashboard can use the `@rezics/dispatch-worker-dashboard` package separately and wire it up to these methods.
**Migration**: Applications that depend on the local HTTP API should use worker object methods instead: `worker.status()` for connection state and counts, `worker.activeTasks()` for in-flight task details.

### Requirement: Port configurable
**Reason**: No longer applicable — the worker SDK does not run an HTTP server.
**Migration**: If the consuming application needs to expose worker data over HTTP, it can create its own server using the worker's programmatic methods.

## ADDED Requirements

### Requirement: Worker exposes status via programmatic methods
The worker object returned by `createWorker()` SHALL expose methods for querying internal state: `status()` returning connection state, mode, uptime, and aggregate task counts; `activeTasks()` returning a list of in-flight task IDs with progress.

#### Scenario: Query worker status
- **WHEN** `worker.status()` is called while the worker is running
- **THEN** it returns an object with `{ mode, connected, uptime, counts: { active, completed, failed } }`

#### Scenario: Query active tasks
- **WHEN** `worker.activeTasks()` is called while 3 tasks are in-flight
- **THEN** it returns an array of 3 objects with `{ taskId, type, startedAt, progress }`
