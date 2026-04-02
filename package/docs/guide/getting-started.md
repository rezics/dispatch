# Getting Started

This guide walks you through setting up Dispatch locally, running the Hub, creating a worker, and submitting your first task.

## Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- [Docker](https://www.docker.com/) (for PostgreSQL)

## 1. Clone and Install

```bash
git clone https://github.com/rezics/dispatch.git
cd dispatch
bun install
```

## 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts a PostgreSQL 17 instance with:
- **User:** `dispatch`
- **Password:** `dispatch`
- **Database:** `dispatch`
- **Port:** `5432`

## 3. Set Up Environment

Create a `.env` file in the `package/hub` directory:

```ini
DATABASE_URL=postgresql://dispatch:dispatch@localhost:5432/dispatch
PORT=3721
NODE_ENV=development
```

## 4. Run Database Migrations

```bash
cd package/hub
bunx prisma migrate dev
```

## 5. Start the Hub

```bash
cd package/hub
bun run dev
```

You should see:

```
Dispatch Hub running on http://localhost:3721
OpenAPI docs at http://localhost:3721/openapi
Dashboard at http://localhost:3721/_dashboard
```

Visit `http://localhost:3721/openapi` to explore the API, or `http://localhost:3721/_dashboard` to see the monitoring dashboard.

## 6. Create a Project

Before submitting tasks, create a project:

```bash
curl -X POST http://localhost:3721/projects \
  -H "Content-Type: application/json" \
  -d '{"id": "my-project", "trustLevel": "full"}'
```

## 7. Submit a Task

```bash
curl -X POST http://localhost:3721/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project": "my-project",
    "type": "hello:greet",
    "payload": { "name": "World" }
  }'
```

## 8. Create a Minimal Worker

Create a new file `my-worker.ts`:

```typescript
import { createWorker, defineWorkerConfig, definePlugin } from '@rezics/dispatch-worker'
import { z } from 'zod'

const greetPlugin = definePlugin({
  name: 'greeter',
  version: '0.1.0',
  capabilities: ['hello:greet'],
  config: z.object({}),
  handlers: {
    'hello:greet': async (task, ctx) => {
      const { name } = task.payload as { name: string }
      ctx.logger.info(`Hello, ${name}!`)
      return { strategy: 'discard' }
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
  plugin: [[greetPlugin, {}]],
})

const worker = createWorker(config)
await worker.start()
```

Run the worker:

```bash
bun run my-worker.ts
```

The worker will poll the Hub for tasks, pick up your `hello:greet` task, and process it.

## What's Next?

- [Architecture](/guide/architecture) -- Understand the Hub-Worker model.
- [Task Lifecycle](/guide/task-lifecycle) -- Learn how tasks flow through the system.
- [Creating a Plugin](/plugins/creating-a-plugin) -- Build a real plugin with configuration and lifecycle hooks.
- [API Reference](/api/overview) -- Explore the full Hub API.
