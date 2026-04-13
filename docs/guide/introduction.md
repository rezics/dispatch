# What is Dispatch?

Dispatch is a distributed task dispatch system with verifiable execution. It provides a central **Hub** that manages a task queue backed by PostgreSQL, and a **Worker SDK** that lets you build workers with pluggable task handlers.

## Key Features

- **Task Queue** -- Priority-based queue with scheduling, automatic retries, and lease management.
- **Worker Orchestration** -- Workers connect via HTTP polling or WebSocket for real-time task dispatch.
- **Verifiable Execution** -- Three trust levels with HMAC-SHA256 signed completion receipts.
- **Plugin Architecture** -- Define task handlers as typed plugins with lifecycle hooks and progress reporting.
- **Result Routing** -- Route completed task results to storage, webhooks, or custom plugins.
- **Authentication & Authorization** -- Session-based dashboard login (JWT or password), trust policies for mapping JWT claims to permissions, and role-based access control.
- **Real-Time Dashboards** -- Built-in web dashboards for both Hub and Worker monitoring.
- **Internationalization** -- Type-safe i18n support with `typesafe-i18n`.

## Use Cases

- **Web scraping orchestration** -- Distribute crawl jobs across multiple workers with rate limiting.
- **Background job processing** -- Offload long-running tasks from your main application.
- **Data pipelines** -- Chain tasks through a reliable queue with retry logic.
- **Distributed computing** -- Fan out work to multiple workers with progress tracking.

## Project Structure

Dispatch is a monorepo with the following packages:

| Package | Description |
| --- | --- |
| `@rezics/dispatch-type` | Shared TypeScript type definitions and validation schemas |
| `@rezics/dispatch-hub` | Central Hub server (Elysia + PostgreSQL) |
| `@rezics/dispatch-worker` | Worker SDK for building task processors |
| `@rezics/dispatch-ui` | Shared React UI components |
| `@rezics/dispatch-i18n` | Internationalization module |
| `@rezics/dispatch-hub-dashboard` | Hub monitoring dashboard (React) |
| `@rezics/dispatch-worker-dashboard` | Worker monitoring dashboard (React) |

## Next Steps

- [Getting Started](/guide/getting-started) -- Set up and run Dispatch locally.
- [Architecture](/guide/architecture) -- Understand how the system works.
- [Creating a Plugin](/plugins/creating-a-plugin) -- Build your first task handler.
