## ADDED Requirements

### Requirement: WS connection with JWT auth
The worker in WS mode SHALL open a WebSocket connection to the hub's `/workers` endpoint with the JWT in the `Authorization` header of the upgrade request.

#### Scenario: Successful connection
- **WHEN** the worker starts in WS mode with a valid JWT
- **THEN** a WebSocket connection is established to the hub

### Requirement: Register message on connect
Immediately after connection, the worker SHALL send a `{ type: 'register', capabilities, concurrency, metadata? }` message with the aggregated capabilities from all loaded plugins.

#### Scenario: Registration sent
- **WHEN** the WS connection opens
- **THEN** a register message is sent with all plugin capabilities and the configured concurrency

### Requirement: Receive and execute dispatched tasks
The worker SHALL listen for `{ type: 'task:dispatch', task }` messages, route the task to the matching plugin handler, and send `{ type: 'task:done', taskId, result }` or `{ type: 'task:fail', taskId, error, retryable }` upon completion.

#### Scenario: Task received and completed
- **WHEN** a `task:dispatch` message arrives with `type: 'book:crawl'`
- **THEN** the book:crawl handler executes and a `task:done` message is sent back

#### Scenario: Task handler throws
- **WHEN** a dispatched task's handler throws an error
- **THEN** a `task:fail` message is sent with the error message and `retryable: true`

### Requirement: Heartbeat every 15 seconds
The worker SHALL send `{ type: 'heartbeat', activeTaskIds }` every 15 seconds with the IDs of currently executing tasks.

#### Scenario: Heartbeat sent
- **WHEN** 15 seconds elapse with tasks t1 and t2 in progress
- **THEN** the worker sends `{ type: 'heartbeat', activeTaskIds: ['t1', 't2'] }`

### Requirement: Handle task:cancel messages
The worker SHALL listen for `{ type: 'task:cancel', taskId }` messages. Upon receipt, the worker SHALL attempt to abort the running task (via AbortController if supported by the handler) and report failure.

#### Scenario: Task cancelled
- **WHEN** a `task:cancel` message arrives for a running task
- **THEN** the task is aborted and a `task:fail` is sent with `error: 'cancelled'` and `retryable: false`

### Requirement: Progress reporting via WS
When a plugin handler calls `ctx.progress(percent, message)`, the worker SHALL send a `{ type: 'task:progress', taskId, percent, message }` message to the hub.

#### Scenario: Progress forwarded
- **WHEN** a handler calls `ctx.progress(50, 'Halfway')`
- **THEN** the worker sends `{ type: 'task:progress', taskId, percent: 50, message: 'Halfway' }`

### Requirement: Auto-reconnect with exponential backoff
On unexpected disconnection, the worker SHALL attempt to reconnect using exponential backoff: `min(1s * 2^attempt + jitter, 30s)`. After reconnecting, the worker re-sends the register message.

#### Scenario: Reconnect after disconnect
- **WHEN** the WebSocket connection drops unexpectedly
- **THEN** the worker waits ~1s, attempts reconnect, and if successful sends a new register message

#### Scenario: Backoff increases
- **WHEN** the first 3 reconnect attempts fail
- **THEN** the delays are approximately 1s, 2s, 4s (plus jitter), capped at 30s

### Requirement: Handle hub ping messages
The worker SHALL respond to `{ type: 'ping' }` messages from the hub by keeping the connection alive (Bun WebSocket handles pong automatically at the protocol level).

#### Scenario: Ping received
- **WHEN** the hub sends a `{ type: 'ping' }` message
- **THEN** the connection remains alive (no explicit response needed beyond WS protocol pong)

### Requirement: Respect concurrency limit in WS mode
The worker SHALL track active task count and send `concurrency` in the register message. If at capacity, the hub is responsible for not dispatching more tasks. If the hub over-dispatches, the worker SHALL queue excess tasks internally.

#### Scenario: Concurrency respected
- **WHEN** `concurrency: 5` and 5 tasks are active
- **THEN** the hub does not dispatch additional tasks to this worker
