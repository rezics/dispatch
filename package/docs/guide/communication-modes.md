# Communication Modes

Workers connect to the Hub using one of two communication modes: **HTTP polling** or **WebSocket push**. The mode is configured per worker.

## HTTP Polling

In HTTP mode, the worker periodically polls the Hub to claim available tasks.

```typescript
const config = defineWorkerConfig({
  hub: { url: 'http://localhost:3721', getToken: async () => token },
  mode: 'http',
  pollInterval: 5000,   // Poll every 5 seconds (default)
  concurrency: 10,      // Claim up to 10 tasks per poll
  plugin: [[myPlugin, {}]],
})
```

### How It Works

1. The worker calls `POST /tasks/claim` at each poll interval.
2. The Hub returns up to `concurrency` pending tasks matching the worker's capabilities.
3. Claimed tasks get a lease (time-limited lock).
4. The worker processes tasks and calls `POST /tasks/complete`.
5. The worker periodically calls `POST /tasks/lease/renew` to extend leases on long-running tasks.

### When to Use

- Simple deployments where low latency is not critical.
- Workers behind firewalls that cannot accept inbound connections.
- Batch processing workloads.

## WebSocket Push

In WebSocket mode, the Hub pushes tasks to the worker in real time.

```typescript
const config = defineWorkerConfig({
  hub: { url: 'http://localhost:3721', getToken: async () => token },
  mode: 'ws',
  concurrency: 10,
  plugin: [[myPlugin, {}]],
})
```

::: tip
When `mode` is `'ws'`, the SDK automatically converts HTTP URLs to WebSocket URLs (`http://` becomes `ws://`, `https://` becomes `wss://`).
:::

### How It Works

1. The worker connects to `WS /workers?token=<jwt>`.
2. The worker sends a `register` message with its capabilities and concurrency.
3. The Hub pushes `task:dispatch` messages as matching tasks become available.
4. The worker sends `task:done`, `task:fail`, or `task:progress` messages back.
5. The worker sends `heartbeat` messages every 15 seconds to maintain the connection.

### When to Use

- Low-latency task dispatch is required.
- Real-time progress tracking is needed.
- Workers can maintain persistent connections.

## Message Types

### Worker to Hub

| Type | Fields | Description |
| --- | --- | --- |
| `register` | `capabilities`, `concurrency` | Register worker capabilities |
| `heartbeat` | (none) | Keep connection alive |
| `task:done` | `taskId`, `result` | Report successful completion |
| `task:fail` | `taskId`, `error`, `retryable` | Report task failure |
| `task:progress` | `taskId`, `percent`, `message` | Report execution progress |

### Hub to Worker

| Type | Fields | Description |
| --- | --- | --- |
| `task:dispatch` | `task` | Dispatch a task for execution |
| `task:cancel` | `taskId` | Cancel a running task |
| `config:update` | `config` | Push configuration changes |
| `ping` | (none) | Connection health check |

## Choosing a Mode

| | HTTP Polling | WebSocket Push |
| --- | --- | --- |
| **Latency** | Poll interval (seconds) | Near real-time |
| **Progress tracking** | Not supported | Supported |
| **Connection** | Stateless | Persistent |
| **Firewall-friendly** | Yes | Requires WS support |
| **Complexity** | Simpler | More moving parts |
| **Reconnection** | Built-in (next poll) | Auto-reconnect with backoff |
