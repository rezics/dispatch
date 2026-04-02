# WebSocket Protocol

The Hub provides a WebSocket endpoint for real-time worker communication. This is used when workers are configured with `mode: 'ws'`.

## Connection

```
WS /workers?token=<jwt>
```

The JWT token is passed as a query parameter. The Hub verifies the token on connection.

**Example (JavaScript):**

```typescript
const ws = new WebSocket('ws://localhost:3721/workers?token=your-jwt-token')
```

## Connection Lifecycle

1. **Connect** -- Worker opens a WebSocket connection with JWT token.
2. **Register** -- Worker sends a `register` message with capabilities and concurrency.
3. **Dispatch** -- Hub pushes `task:dispatch` messages as matching tasks become available.
4. **Process** -- Worker processes tasks, sending progress/completion messages.
5. **Heartbeat** -- Worker sends `heartbeat` every 15 seconds to keep the connection alive.
6. **Disconnect** -- On close, the Hub marks the worker as disconnected. Assigned tasks are reclaimed by the Reaper when their leases expire.

## Worker to Hub Messages

### register

Sent once after connection to declare the worker's capabilities.

```json
{
  "type": "register",
  "capabilities": ["book:crawl", "book:update"],
  "concurrency": 10
}
```

### heartbeat

Sent periodically to keep the connection alive. The Hub disconnects workers that miss heartbeats for 30 seconds.

```json
{ "type": "heartbeat" }
```

### task:done

Report successful task completion with a result.

```json
{
  "type": "task:done",
  "taskId": "a1b2c3d4-...",
  "result": {
    "strategy": "webhook",
    "url": "https://example.com/callback",
    "data": { "title": "Example Book" }
  }
}
```

### task:fail

Report task failure.

```json
{
  "type": "task:fail",
  "taskId": "a1b2c3d4-...",
  "error": "Connection timeout",
  "retryable": true
}
```

### task:progress

Report execution progress for long-running tasks. Progress is stored in memory on the Hub and accessible via `GET /tasks/:id`.

```json
{
  "type": "task:progress",
  "taskId": "a1b2c3d4-...",
  "percent": 45,
  "message": "Parsing book metadata"
}
```

## Hub to Worker Messages

### task:dispatch

Push a task to the worker for execution.

```json
{
  "type": "task:dispatch",
  "task": {
    "id": "a1b2c3d4-...",
    "project": "my-project",
    "type": "book:crawl",
    "payload": { "url": "https://example.com/book/123" },
    "priority": 8,
    "status": "running",
    "attempts": 0,
    "maxAttempts": 3
  }
}
```

### task:cancel

Request the worker to stop processing a task.

```json
{
  "type": "task:cancel",
  "taskId": "a1b2c3d4-..."
}
```

### config:update

Push configuration changes to the worker.

```json
{
  "type": "config:update",
  "config": { "concurrency": 20 }
}
```

### ping

Connection health check. No response required from the worker.

```json
{ "type": "ping" }
```

## Close Codes

| Code | Meaning |
| --- | --- |
| `4001` | Authentication failed (missing or invalid token) |
| `1000` | Normal closure |
