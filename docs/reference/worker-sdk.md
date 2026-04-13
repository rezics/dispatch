# Worker SDK Reference

The `@rezics/dispatch-worker` package provides the SDK for building Dispatch workers. It is a pure library with no process or server assumptions, making it embeddable in any JavaScript/TypeScript runtime.

## Installation

```bash
bun add @rezics/dispatch-worker
```

## Exports

```typescript
// Core functions
export { createWorker, type Worker } from './core/worker'
export { defineWorkerConfig, type WorkerConfig, type WorkerConfigInput } from './core/config'
export { definePlugin } from '@rezics/dispatch-type'

// Type re-exports
export type {
  DispatchPlugin,
  PluginContext,
  PluginHandler,
  Logger,
  Task,
  TaskResult,
  VerificationMode,
  WorkerMessage,
  HubMessage,
  CompletionReceipt,
  SingleRunConfig,
  WorkerStatus,
  ActiveTaskInfo,
} from '@rezics/dispatch-type'
```

## Subpath Exports

| Path | Description |
| --- | --- |
| `@rezics/dispatch-worker` | SDK (createWorker, definePlugin, types) |
| `@rezics/dispatch-worker/bin` | Standalone Bun entry point (reads env, handles signals) |
| `@rezics/dispatch-worker/book-crawler` | Book crawler worker plugin |
| `@rezics/dispatch-worker/anime-crawler` | Anime crawler worker plugin |

## Quick Example

```typescript
import { createWorker, defineWorkerConfig, definePlugin } from '@rezics/dispatch-worker'
import { z } from 'zod'

const myPlugin = definePlugin({
  name: 'echo',
  version: '1.0.0',
  capabilities: ['echo:run'],
  config: z.object({}),
  handlers: {
    'echo:run': async (task, ctx) => {
      ctx.logger.info(`Echo: ${JSON.stringify(task.payload)}`)
      return { strategy: 'store', data: task.payload }
    },
  },
})

const config = defineWorkerConfig({
  hub: {
    url: 'http://localhost:3721',
    getToken: async () => 'your-jwt-token',
  },
  mode: 'http',
  concurrency: 5,
  plugin: [[myPlugin, {}]],
})

const worker = createWorker(config)
await worker.start()
```

## Function Reference

### `definePlugin<TConfig>(plugin)`

Validates and returns a plugin definition. See [Plugin API Reference](/plugins/plugin-api-reference).

### `defineWorkerConfig(input)`

Validates and returns a worker configuration. See [Configuration Reference](/reference/configuration).

### `createWorker(config): Worker`

Creates a worker instance with the following methods:

| Method | Returns | Description |
| --- | --- | --- |
| `start()` | `Promise<void>` | Start the worker. In single-run mode, resolves when all tasks complete or timeout is reached. |
| `stop()` | `Promise<void>` | Stop the worker gracefully (waits for in-flight tasks up to `shutdownTimeout`). |
| `capabilities()` | `string[]` | List of task types this worker can handle. |
| `status()` | `WorkerStatus` | Current worker status: mode, connected state, uptime, task counts. |
| `activeTasks()` | `ActiveTaskInfo[]` | List of in-flight tasks with progress information. |

### `WorkerStatus`

```typescript
interface WorkerStatus {
  mode: 'http' | 'ws' | 'single-run'
  connected: boolean
  uptime: number            // milliseconds since start
  counts: {
    active: number          // currently executing
    completed: number       // total completed
    failed: number          // total failed
  }
}
```

### `ActiveTaskInfo`

```typescript
interface ActiveTaskInfo {
  taskId: string
  type: string
  startedAt: Date
  progress: number | null   // 0-100 if reported by handler
}
```

## Type Reference

All types are defined in `@rezics/dispatch-type` and re-exported from the worker package. See [Type Definitions](/reference/type-definitions) for the complete reference.
