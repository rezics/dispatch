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
| `mode` | `'http' \| 'ws'` | No | `'http'` | Communication mode |
| `concurrency` | `number` | No | `10` | Max concurrent tasks (minimum: 1) |
| `pollInterval` | `number` | No | `5000` | Poll interval in ms, HTTP mode only (minimum: 1000) |
| `shutdownTimeout` | `number` | No | `30000` | Graceful shutdown timeout in ms (minimum: 0) |
| `plugin` | `[DispatchPlugin, unknown][]` | No | `[]` | Array of `[plugin, config]` tuples |

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

// Later:
await worker.stop()
```

### Worker Interface

| Method | Returns | Description |
| --- | --- | --- |
| `start()` | `Promise<void>` | Start the worker (loads plugins, begins claiming/connecting) |
| `stop()` | `Promise<void>` | Graceful shutdown (unloads plugins, waits for active tasks) |
| `capabilities()` | `string[]` | List all registered capabilities |

The worker handles `SIGINT` and `SIGTERM` signals automatically for graceful shutdown.

## Hub Configuration

The Hub is configured exclusively through [environment variables](/deploy/environment-variables). There is no programmatic configuration API for the Hub.

## Project Configuration

Projects are configured via the [REST API](/api/projects):

```bash
# Create a project with receipted trust
curl -X POST http://localhost:3721/projects \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-project",
    "trustLevel": "receipted",
    "receiptSecret": "my-secret-key"
  }'

# Update trust level
curl -X PATCH http://localhost:3721/projects/my-project \
  -H "Content-Type: application/json" \
  -d '{ "trustLevel": "audited" }'
```
