# Environment Variables

## Hub Configuration

These environment variables configure the Dispatch Hub server.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/db`) |
| `PORT` | No | `3721` | HTTP server port |
| `NODE_ENV` | No | `development` | Environment mode (`development` or `production`). Controls CORS and server timing headers. |
| `REAPER_INTERVAL` | No | `30s` | How often the Reaper checks for expired leases (e.g., `10s`, `1m`) |
| `DISPATCH_DISABLE_DASHBOARD` | No | `false` | Set to `true` to disable the built-in monitoring dashboard |

### Example `.env`

```ini
DATABASE_URL=postgresql://dispatch:dispatch@localhost:5432/dispatch
PORT=3721
NODE_ENV=production
REAPER_INTERVAL=30s
DISPATCH_DISABLE_DASHBOARD=false
```

## Worker Configuration

Workers are configured programmatically via `defineWorkerConfig`, not through environment variables. However, you can read environment variables in your worker script:

```typescript
import { createWorker, defineWorkerConfig } from '@rezics/dispatch-worker'
import myPlugin from './my-plugin'

const config = defineWorkerConfig({
  hub: {
    url: process.env.HUB_URL ?? 'http://localhost:3721',
    getToken: async () => process.env.WORKER_TOKEN ?? '',
  },
  mode: (process.env.WORKER_MODE as 'http' | 'ws') ?? 'http',
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 10),
  pollInterval: Number(process.env.WORKER_POLL_INTERVAL ?? 5000),
  shutdownTimeout: Number(process.env.WORKER_SHUTDOWN_TIMEOUT ?? 30000),
  plugin: [[myPlugin, { /* plugin config */ }]],
})

const worker = createWorker(config)
await worker.start()
```

### Worker Config Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `hub.url` | `string` | (required) | Hub server URL |
| `hub.getToken` | `() => Promise<string>` | (required) | Function that returns a JWT token |
| `mode` | `'http' \| 'ws'` | `'http'` | Communication mode |
| `concurrency` | `number` | `10` | Maximum concurrent tasks |
| `pollInterval` | `number` | `5000` | Poll interval in ms (HTTP mode only) |
| `shutdownTimeout` | `number` | `30000` | Graceful shutdown timeout in ms |
| `plugin` | `[Plugin, Config][]` | `[]` | Plugin registrations |
