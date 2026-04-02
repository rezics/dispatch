# Dispatch

Distributed task dispatch system with verifiable execution.

Dispatch provides a central **Hub** that manages a priority task queue backed by PostgreSQL, and a **Worker SDK** for building pluggable task processors with typed configuration, lifecycle hooks, and multiple trust levels.

## Quick Start

```bash
# Start PostgreSQL
docker compose up -d

# Install dependencies
bun install

# Run database migrations
cd package/hub && bunx prisma migrate dev

# Start the Hub
bun run dev
```

The Hub runs at `http://localhost:3721` with OpenAPI docs at `/openapi` and a monitoring dashboard at `/_dashboard`.

## Packages

| Package | Description |
| --- | --- |
| [`@rezics/dispatch-hub`](package/hub) | Central Hub server (Elysia + PostgreSQL) |
| [`@rezics/dispatch-worker`](package/worker) | Worker SDK for building task processors |
| [`@rezics/dispatch-type`](package/type) | Shared TypeScript type definitions |
| [`@rezics/dispatch-ui`](package/ui) | Shared React UI components |
| [`@rezics/dispatch-i18n`](package/i18n) | Internationalization module |
| [`@rezics/dispatch-hub-dashboard`](package/hub-dashboard) | Hub monitoring dashboard |
| [`@rezics/dispatch-worker-dashboard`](package/worker-dashboard) | Worker monitoring dashboard |

## Documentation

Full documentation is available at [rezics.github.io/dispatch](https://rezics.github.io/dispatch/).

## License

[GPL-3.0](LICENSE)
