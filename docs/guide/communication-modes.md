# Communication Modes

Workers connect to the Hub using one of three modes: **HTTP polling**, **WebSocket push**, or **single-run**. The mode is configured per worker.

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
5. The worker sends periodic `POST /workers/heartbeat` requests to extend leases for all held tasks.

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

## Single-Run Mode

Single-run mode is designed for bounded-lifetime environments like browser extension service workers, cron jobs, or serverless functions. The worker claims a batch, processes it, and exits.

```typescript
const config = defineWorkerConfig({
  hub: { url: 'http://localhost:3721', getToken: async () => token },
  mode: 'single-run',
  timeout: 120_000,        // Max run duration (required)
  claimCount: 500,         // Tasks to claim (default: concurrency)
  concurrency: 50,         // Max parallel tasks
  heartbeatInterval: 60_000,
  plugin: [[myPlugin, {}]],
})
```

### How It Works

1. `worker.start()` claims `claimCount` tasks in one `POST /tasks/claim` request.
2. Starts a heartbeat timer (`POST /workers/heartbeat`).
3. Processes tasks concurrently up to `concurrency`.
4. Submits results to the hub as tasks complete.
5. Resolves the `start()` promise when all tasks are done **or** the `timeout` is reached.

### Timeout Behavior

When the timeout is reached:

1. No new task executions are started.
2. In-flight tasks are given `shutdownTimeout` (default 30s) to complete.
3. Tasks that don't finish within the shutdown window are abandoned (their leases will expire on the hub).
4. Results for completed tasks are submitted before the promise resolves.

### When to Use

- Browser extension service workers (bounded activation time).
- Cron jobs or scheduled tasks.
- Serverless functions with execution time limits.
- Any environment where the worker cannot run indefinitely.

## Heartbeat Model

In HTTP and single-run modes, the worker sends periodic `POST /workers/heartbeat` requests. Each heartbeat extends the leases on all tasks currently held by that worker.

| Setting | Default | Description |
| --- | --- | --- |
| `heartbeatInterval` | 60s | How often the worker sends a heartbeat |
| Grace period | 3x interval | Lease duration set on claimed tasks. If 3 heartbeats are missed, the worker is considered dead. |

### Max Hold Time

Projects can configure a `maxTaskHoldTime` (in seconds) that limits how long a worker can hold tasks, regardless of heartbeat. This prevents a buggy worker from holding tasks indefinitely while still heartbeating.

- Set via `POST /projects` or `PATCH /projects/:id` with `maxTaskHoldTime`.
- When tasks are claimed, the hub sets `maxHoldExpiresAt = NOW() + maxTaskHoldTime`.
- The reaper reclaims tasks where `maxHoldExpiresAt` has passed, even if the lease is still valid.
- Default: `null` (no limit). Set generously relative to expected processing time.

### Failure Handling

- Single heartbeat failure: warning logged, retry on next interval.
- 3+ consecutive failures: error logged indicating leases are likely expired.
- In WebSocket mode: the WS connection itself serves as the liveness signal (heartbeat messages every 15s). HTTP heartbeat is not used.

## Embedding the Worker as a Library

The worker SDK (`@rezics/dispatch-worker`) is a pure library with no process or server assumptions. It can be embedded in any JavaScript/TypeScript runtime:

### Standalone (Bun)

```typescript
// Use the built-in bin entry point
import '@rezics/dispatch-worker/bin'
// Or wire it up yourself:
import { createWorker, defineWorkerConfig } from '@rezics/dispatch-worker'
const worker = createWorker(config)
process.on('SIGINT', () => worker.stop())
await worker.start()
```

### Tauri Desktop App

```typescript
import { createWorker, defineWorkerConfig } from '@rezics/dispatch-worker'

const config = defineWorkerConfig({
  hub: { url: hubUrl, getToken: async () => fetchTokenFromTauriStore() },
  mode: 'http',
  plugin: [[crawlerPlugin, pluginConfig]],
})

const worker = createWorker(config)
// Start/stop tied to app lifecycle
onMount(() => worker.start())
onCleanup(() => worker.stop())
// Query worker status for the UI
const status = worker.status()
const tasks = worker.activeTasks()
```

### Browser Extension

```typescript
import { createWorker, defineWorkerConfig } from '@rezics/dispatch-worker'

chrome.alarms.onAlarm.addListener(async () => {
  const config = defineWorkerConfig({
    hub: { url: hubUrl, getToken: async () => getStoredToken() },
    mode: 'single-run',
    timeout: 25_000,  // Service workers have ~30s
    plugin: [[crawlerPlugin, pluginConfig]],
  })
  const worker = createWorker(config)
  await worker.start()
})
```

## Choosing a Mode

| | HTTP Polling | WebSocket Push | Single-Run |
| --- | --- | --- | --- |
| **Latency** | Poll interval (seconds) | Near real-time | N/A (batch) |
| **Progress tracking** | Not supported | Supported | Not supported |
| **Connection** | Stateless | Persistent | One-shot |
| **Firewall-friendly** | Yes | Requires WS support | Yes |
| **Bounded lifetime** | No | No | Yes |
| **Use case** | Long-running workers | Real-time dispatch | Cron, extensions |
