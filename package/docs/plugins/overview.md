# Plugin Overview

Plugins are the core mechanism for defining task handlers in Dispatch. Each plugin declares a set of **capabilities** (task types it can handle) and provides a **handler function** for each capability.

## What is a Plugin?

A plugin is a TypeScript object that:

1. Declares which task types it can handle (capabilities).
2. Defines a Zod schema for its configuration.
3. Implements handler functions that process tasks and return results.
4. Optionally defines lifecycle hooks for setup and teardown.

## Plugin Anatomy

```typescript
import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-worker'

export default definePlugin({
  // Identity
  name: 'my-plugin',
  version: '0.1.0',
  displayName: 'My Plugin',
  description: 'Does something useful',

  // Capabilities -- task types this plugin handles
  capabilities: ['my:task', 'my:other-task'],

  // Configuration schema (validated with Zod)
  config: z.object({
    apiKey: z.string(),
    maxRetries: z.number().default(3),
  }),

  // Optional: preferred trust level and communication mode
  trust: 'receipted',
  mode: 'http',

  // Lifecycle hooks
  async onLoad(ctx) { /* called when worker starts */ },
  async onUnload(ctx) { /* called on shutdown */ },
  async onError(error, ctx) { /* called on unhandled errors */ },

  // Task handlers -- one per capability
  handlers: {
    'my:task': async (task, ctx) => {
      // Process task...
      return { strategy: 'store', data: { result: 'done' } }
    },
    'my:other-task': async (task, ctx) => {
      return { strategy: 'discard' }
    },
  },
})
```

## How Plugins Register

Plugins are registered with the worker via `defineWorkerConfig`:

```typescript
import { createWorker, defineWorkerConfig } from '@rezics/dispatch-worker'
import myPlugin from './my-plugin'

const config = defineWorkerConfig({
  hub: { url: 'http://localhost:3721', getToken: async () => token },
  plugin: [
    [myPlugin, { apiKey: 'abc123', maxRetries: 5 }],
  ],
})

const worker = createWorker(config)
await worker.start()
```

Each plugin is registered as a tuple of `[plugin, config]`. The config object is validated against the plugin's Zod schema at startup.

## How Tasks are Routed

When a worker receives a task, the Plugin Registry matches the task's `type` field against registered plugin capabilities:

1. Task with `type: "book:crawl"` arrives.
2. Registry finds the plugin that declared `"book:crawl"` in its `capabilities`.
3. The plugin's `handlers["book:crawl"]` function is called.
4. The handler returns a `TaskResult`.

Each capability must be handled by exactly one plugin. If two plugins declare the same capability, the worker will throw an error at startup.

## Next Steps

- [Creating a Plugin](/plugins/creating-a-plugin) -- Step-by-step tutorial.
- [Plugin API Reference](/plugins/plugin-api-reference) -- Full type documentation.
- [Result Strategies](/plugins/result-strategies) -- How to return results.
