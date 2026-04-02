# Worker SDK Reference

The `@rezics/dispatch-worker` package provides the SDK for building Dispatch workers.

## Installation

```bash
bun add @rezics/dispatch-worker
```

## Exports

```typescript
// Core functions
export { createWorker } from './core/worker'
export { defineWorkerConfig, type WorkerConfig } from './core/config'
export { definePlugin } from '@rezics/dispatch-type'

// Type re-exports
export type {
  DispatchPlugin,
  PluginContext,
  PluginHandler,
  Logger,
  Task,
  TaskResult,
  TrustLevel,
  WorkerMessage,
  HubMessage,
  CompletionReceipt,
} from '@rezics/dispatch-type'
```

## Quick Example

```typescript
import { createWorker, defineWorkerConfig, definePlugin } from '@rezics/dispatch-worker'
import { z } from 'zod'

// 1. Define a plugin
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

// 2. Configure the worker
const config = defineWorkerConfig({
  hub: {
    url: 'http://localhost:3721',
    getToken: async () => 'your-jwt-token',
  },
  mode: 'http',
  concurrency: 5,
  plugin: [[myPlugin, {}]],
})

// 3. Start the worker
const worker = createWorker(config)
await worker.start()
```

## Function Reference

### `definePlugin<TConfig>(plugin)`

Validates and returns a plugin definition. See [Plugin API Reference](/plugins/plugin-api-reference).

### `defineWorkerConfig(input)`

Validates and returns a worker configuration. See [Configuration Reference](/reference/configuration).

### `createWorker(config)`

Creates a worker instance. See [Configuration Reference](/reference/configuration#createworker-config).

## Type Reference

All types are defined in `@rezics/dispatch-type` and re-exported from the worker package. See [Type Definitions](/reference/type-definitions) for the complete reference.
