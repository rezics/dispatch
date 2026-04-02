# Deployment Overview

This section covers deploying Dispatch in production environments.

## Architecture

A production Dispatch deployment consists of:

- **1 Hub instance** -- The central server managing the task queue.
- **N Worker instances** -- One or more workers processing tasks.
- **1 PostgreSQL database** -- Backing store for the Hub.

```
                  +------------+
                  | PostgreSQL |
                  +------+-----+
                         |
                  +------+-----+
                  |    Hub     |
                  |  :3721     |
                  +------+-----+
                    /    |    \
                   /     |     \
            +-----+  +--+--+  +-----+
            |  W1 |  | W2  |  | W3  |
            +-----+  +-----+  +-----+
```

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production` on the Hub.
- [ ] Use a strong, unique `receiptSecret` for each project.
- [ ] Configure proper JWT authentication for workers.
- [ ] Set up PostgreSQL with connection pooling and backups.
- [ ] Tune `REAPER_INTERVAL` based on your task lease durations.
- [ ] Consider disabling the dashboard in production (`DISPATCH_DISABLE_DASHBOARD=true`) or protecting it behind authentication.
- [ ] Set appropriate `concurrency` per worker based on available resources.
- [ ] Configure `maxAttempts` per task type to prevent infinite retries.

## Database Requirements

- PostgreSQL 17 or later (recommended).
- The Hub uses Prisma ORM for migrations and queries.
- Key indices are defined on `Task(project, status, priority, scheduledAt)` and `Task(status, leaseExpiresAt)` for efficient claiming and reaping.

## Next Steps

- [Docker](/deploy/docker) -- Deploy with Docker Compose.
- [Environment Variables](/deploy/environment-variables) -- Complete configuration reference.
