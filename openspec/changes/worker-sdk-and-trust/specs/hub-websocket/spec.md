## ADDED Requirements

### Requirement: WS endpoint at /workers
The hub SHALL accept WebSocket upgrade requests at `/workers` authenticated via Bearer JWT in the upgrade headers. Upon successful upgrade, the connection is held open for bidirectional messaging.

#### Scenario: Successful WS connection
- **WHEN** a worker sends a WS upgrade to `/workers` with a valid JWT
- **THEN** the connection is upgraded and the hub awaits a `register` message

#### Scenario: Unauthenticated WS rejected
- **WHEN** a WS upgrade request arrives without a valid JWT
- **THEN** the hub rejects the upgrade with HTTP 401

### Requirement: Worker registration via register message
Upon receiving a `{ type: 'register', capabilities, concurrency, metadata? }` message, the hub SHALL create or update the worker record in the database and mark it as online in WS mode.

#### Scenario: Worker registers
- **WHEN** the hub receives `{ type: 'register', capabilities: ['book:crawl'], concurrency: 10 }`
- **THEN** a worker record is created with the JWT's `sub` as ID, capabilities, concurrency, and `mode: 'ws'`

### Requirement: Task dispatch via task:dispatch message
The hub SHALL push tasks to WS-connected workers by sending `{ type: 'task:dispatch', task }` messages. The hub selects workers based on matching capabilities and available concurrency (concurrency - active task count).

#### Scenario: Task dispatched to matching worker
- **WHEN** a new task with `type: 'book:crawl'` is created and a WS worker with capability `'book:crawl'` has available concurrency
- **THEN** the hub sends `{ type: 'task:dispatch', task }` to that worker

#### Scenario: No matching worker available
- **WHEN** a task is created but no WS worker has the matching capability or all are at capacity
- **THEN** the task remains `pending` for HTTP Lease workers or future WS workers to pick up

### Requirement: Heartbeat protocol
The hub SHALL expect a `{ type: 'heartbeat', activeTaskIds }` message from each WS worker every 15 seconds. The hub updates the worker's `lastSeen` timestamp on each heartbeat.

#### Scenario: Heartbeat received
- **WHEN** a heartbeat arrives with `activeTaskIds: ['t1', 't2']`
- **THEN** the worker's `lastSeen` is updated to now

### Requirement: Disconnect detection after 30s
If no heartbeat is received within 30 seconds, the hub SHALL mark the worker as offline, remove its WS connection, and leave its running tasks for the reaper to reclaim.

#### Scenario: Worker goes silent
- **WHEN** 30 seconds pass without a heartbeat from a WS worker
- **THEN** the hub closes the connection, deletes the worker record, and the reaper reclaims its running tasks on next cycle

### Requirement: Task completion via WS messages
The hub SHALL accept `{ type: 'task:done', taskId, result }` and `{ type: 'task:fail', taskId, error, retryable }` messages and process them identically to the HTTP completion flow.

#### Scenario: Task done via WS
- **WHEN** the hub receives `{ type: 'task:done', taskId: 't1', result: { strategy: 'discard' } }`
- **THEN** task t1 is marked `done` and the result plugin runner is invoked

### Requirement: Task cancellation via task:cancel
The hub SHALL send `{ type: 'task:cancel', taskId }` to a WS worker when a task needs to be cancelled (e.g., via admin API). The worker is expected to stop processing and report failure.

#### Scenario: Cancel sent to worker
- **WHEN** an admin calls `DELETE /tasks/t1` (or a cancellation API)
- **THEN** the hub sends `{ type: 'task:cancel', taskId: 't1' }` to the assigned WS worker

### Requirement: Progress tracking via task:progress
The hub SHALL accept `{ type: 'task:progress', taskId, percent, message? }` messages and store the latest progress for API consumers to query.

#### Scenario: Progress updated
- **WHEN** the hub receives `{ type: 'task:progress', taskId: 't1', percent: 75, message: 'Parsing' }`
- **THEN** the progress is available when querying `GET /tasks/t1`
