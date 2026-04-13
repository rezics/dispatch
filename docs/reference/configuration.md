# Configuration Reference

## `defineWorkerConfig(input)`

Creates a validated worker configuration. Throws if any field fails validation or if a plugin's config doesn't match its Zod schema.

```typescript
import { defineWorkerConfig } from '@rezics/dispatch-worker'

const config = defineWorkerConfig({
  hub: {
    url: 'http://localhost:3721',
    getToken: async () => 'jwt-token',
  },
  mode: 'http',
  concurrency: 10,
  pollInterval: 5000,
  shutdownTimeout: 30000,
  heartbeatInterval: 60000,
  plugin: [
    [myPlugin, { key: 'value' }],
  ],
})
```

### Input Fields

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `hub.url` | `string` | Yes | | Hub server URL (must be a valid URL) |
| `hub.getToken` | `() => Promise<string>` | Yes | | Async function returning a JWT token |
| `mode` | `'http' \| 'ws' \| 'single-run'` | No | `'http'` | Communication mode |
| `concurrency` | `number` | No | `10` | Max concurrent tasks (minimum: 1) |
| `pollInterval` | `number` | No | `5000` | Poll interval in ms, HTTP mode only (minimum: 1000) |
| `shutdownTimeout` | `number` | No | `30000` | Graceful shutdown timeout in ms (minimum: 0) |
| `heartbeatInterval` | `number` | No | `60000` | Heartbeat interval in ms (minimum: 5000) |
| `plugin` | `[DispatchPlugin, unknown][]` | No | `[]` | Array of `[plugin, config]` tuples |
| `logger` | `Logger` | No | console-based | Custom logger instance |
| `timeout` | `number` | single-run only | | Max run duration in ms (required for single-run mode) |
| `claimCount` | `number` | No | `concurrency` | Tasks to claim per run (single-run mode only) |

### Single-Run Mode

When `mode` is `'single-run'`, the `timeout` field is required:

```typescript
defineWorkerConfig({
  hub: { url: '...', getToken: fn },
  mode: 'single-run',
  timeout: 120_000,      // Required: max run duration
  claimCount: 500,        // Optional: tasks to claim (default: concurrency)
  concurrency: 50,
  heartbeatInterval: 60_000,
  plugin: [...],
})
```

### URL Auto-Conversion

When `mode` is `'ws'`, HTTP URLs are automatically converted to WebSocket URLs:
- `http://` becomes `ws://`
- `https://` becomes `wss://`

### Plugin Config Validation

Each plugin's config is validated against its Zod schema at startup:

```typescript
// If myPlugin.config is z.object({ key: z.string() }),
// this will throw because 'key' is missing:
defineWorkerConfig({
  // ...
  plugin: [[myPlugin, {}]],  // Error: Required at "key"
})
```

## `createWorker(config)`

Creates a worker instance from a validated configuration.

```typescript
import { createWorker } from '@rezics/dispatch-worker'

const worker = createWorker(config)
await worker.start()

// Query status programmatically
console.log(worker.status())       // { mode, connected, uptime, counts }
console.log(worker.activeTasks())  // [{ taskId, type, startedAt, progress }]

// Later:
await worker.stop()
```

### Worker Interface

| Method | Returns | Description |
| --- | --- | --- |
| `start()` | `Promise<void>` | Start the worker (loads plugins, begins claiming/connecting) |
| `stop()` | `Promise<void>` | Graceful shutdown (unloads plugins, waits for active tasks) |
| `capabilities()` | `string[]` | List all registered capabilities |
| `status()` | `WorkerStatus` | Current worker status (mode, connected, uptime, task counts) |
| `activeTasks()` | `ActiveTaskInfo[]` | In-flight tasks with progress info |

The worker does **not** register signal handlers or call `process.exit()`. Signal handling is the consuming application's responsibility. Use the standalone entry point (`@rezics/dispatch-worker/bin`) for a ready-made Bun runner with signal handling.

## Hub Configuration

The Hub is configured exclusively through [environment variables](/deploy/environment-variables). There is no programmatic configuration API for the Hub.

## Project Configuration

Projects are configured via the [REST API](/api/projects):

```bash
# Create a project with receipted trust and max hold time
curl -X POST http://localhost:3721/projects \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-project",
    "verification": "receipted",
    "receiptSecret": "my-secret-key",
    "maxTaskHoldTime": 3600
  }'

# Update max hold time
curl -X PATCH http://localhost:3721/projects/my-project \
  -H "Content-Type: application/json" \
  -d '{ "maxTaskHoldTime": 7200 }'

# Remove max hold time limit
curl -X PATCH http://localhost:3721/projects/my-project \
  -H "Content-Type: application/json" \
  -d '{ "maxTaskHoldTime": null }'
```

### Project Fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Project identifier |
| `verification` | `string` | Trust level: `'none'`, `'receipted'`, or `'audited'` |
| `receiptSecret` | `string?` | HMAC secret for receipt signing (receipted mode) |
| `jwksUri` | `string?` | JWKS endpoint for audited verification |
| `maxTaskHoldTime` | `integer?` | Max seconds a worker can hold tasks (null = no limit) |
