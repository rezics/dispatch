# Creating a Plugin

This tutorial walks through building a plugin from scratch, using the built-in book-crawler plugin as a reference.

## Step 1: Define the Config Schema

Every plugin has a typed configuration validated with [Zod](https://zod.dev):

```typescript
import { z } from 'zod'

const configSchema = z.object({
  rateLimit: z.number().default(10),       // requests per second
  proxy: z.url().optional(),               // optional proxy URL
  sources: z.array(
    z.enum(['qidian', 'jjwxc', 'novel'])
  ).default(['qidian']),
})

type BookCrawlerConfig = z.infer<typeof configSchema>
```

## Step 2: Create the Plugin

Use `definePlugin` to create a type-safe plugin. The generic parameter ensures your handlers receive the correct config type:

```typescript
import { definePlugin } from '@rezics/dispatch-worker'
import type { PluginContext, Task, TaskResult } from '@rezics/dispatch-worker'

export default definePlugin({
  name: '@rezics/dispatch-worker/book-crawler',
  version: '0.1.0',
  capabilities: ['book:crawl', 'book:update'],
  config: configSchema,
  displayName: 'Book Crawler',
  description: 'Crawls book metadata from web novel sources',
  trust: 'receipted',
  mode: 'http',

  // ... lifecycle hooks and handlers (see below)
})
```

::: info
`definePlugin` validates that every capability listed has a corresponding handler. If you declare `capabilities: ['a', 'b']` but only provide `handlers: { 'a': ... }`, it throws an error at import time.
:::

## Step 3: Add Lifecycle Hooks

Lifecycle hooks run at specific points in the worker's lifetime:

```typescript
{
  async onLoad(ctx: PluginContext<BookCrawlerConfig>) {
    // Called when the worker starts -- set up resources
    ctx.logger.info(`Book crawler loaded: rate limit ${ctx.config.rateLimit} req/s`)
    ctx.logger.info(`Sources: ${ctx.config.sources.join(', ')}`)
  },

  async onUnload(ctx: PluginContext<BookCrawlerConfig>) {
    // Called on graceful shutdown -- clean up resources
    ctx.logger.info('Book crawler unloaded')
  },

  async onError(error: Error, ctx: PluginContext<BookCrawlerConfig>) {
    // Called on unhandled errors
    ctx.logger.error(`Unhandled error: ${error.message}`)
  },
}
```

## Step 4: Implement Handlers

Each handler receives the `Task` and a `PluginContext`, and must return a `TaskResult`:

```typescript
{
  handlers: {
    'book:crawl': async (task: Task, ctx: PluginContext<BookCrawlerConfig>): Promise<TaskResult> => {
      const { url, webhookUrl } = task.payload as { url: string; webhookUrl: string }

      // Report progress (WebSocket mode only)
      await ctx.progress(10, 'Fetching page')
      const html = await fetch(url).then(r => r.text())

      await ctx.progress(80, 'Parsing book metadata')
      const book = parseBook(html, url)

      ctx.logger.info(`Crawled: ${book.title} by ${book.author}`)

      // Return result -- sent to the webhook URL
      return { strategy: 'webhook', url: webhookUrl, data: book }
    },

    'book:update': async (task: Task, ctx: PluginContext<BookCrawlerConfig>): Promise<TaskResult> => {
      const { url, webhookUrl, previousHash } = task.payload as {
        url: string; webhookUrl: string; previousHash: string
      }

      await ctx.progress(10, 'Checking for updates')
      const html = await fetch(url).then(r => r.text())
      const book = parseBook(html, url)

      // No changes? Discard the result.
      if (book.contentHash === previousHash) {
        ctx.logger.info(`No changes detected for: ${url}`)
        return { strategy: 'discard' }
      }

      ctx.logger.info(`Changes detected for: ${book.title}`)
      return { strategy: 'webhook', url: webhookUrl, data: book }
    },
  },
}
```

## Step 5: Register with the Worker

```typescript
import { createWorker, defineWorkerConfig } from '@rezics/dispatch-worker'
import bookCrawler from './book-crawler'

const config = defineWorkerConfig({
  hub: {
    url: 'http://localhost:3721',
    getToken: async () => 'your-jwt-token',
  },
  mode: 'http',
  concurrency: 5,
  pollInterval: 5000,
  plugin: [
    [bookCrawler, {
      rateLimit: 10,
      sources: ['qidian', 'jjwxc'],
    }],
  ],
})

const worker = createWorker(config)
await worker.start()
```

The config object `{ rateLimit: 10, sources: ['qidian', 'jjwxc'] }` is validated against `configSchema` at startup. Invalid config throws immediately.

## Using the PluginContext

The `PluginContext` provides three tools:

### `ctx.config`

The validated plugin configuration object, fully typed:

```typescript
ctx.config.rateLimit   // number
ctx.config.proxy       // string | undefined
ctx.config.sources     // ('qidian' | 'jjwxc' | 'novel')[]
```

### `ctx.logger`

Structured logging with four levels:

```typescript
ctx.logger.info('Processing task')
ctx.logger.warn('Rate limit approaching')
ctx.logger.error('Request failed')
ctx.logger.debug('Response body: ...', body)
```

### `ctx.progress(percent, message?)`

Report progress for long-running tasks. Progress is accessible via `GET /tasks/:id` when using WebSocket mode:

```typescript
await ctx.progress(0, 'Starting')
await ctx.progress(50, 'Halfway done')
await ctx.progress(100, 'Complete')
```
