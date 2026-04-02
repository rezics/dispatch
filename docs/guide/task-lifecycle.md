# Task Lifecycle

Every task in Dispatch follows a well-defined lifecycle from submission to completion.

## State Machine

```
                    +----------+
                    | pending  |
                    +----+-----+
                         |
                    claim / dispatch
                         |
                    +----v-----+
             +------+ running  +------+
             |      +----------+      |
          success                  failure
             |                        |
        +----v-----+           +------v-----+
        |   done   |           | retryable? |
        +----------+           +------+-----+
                                 yes  |  no
                               +------+------+
                               |             |
                          +----v-----+  +----v-----+
                          | pending  |  |  failed  |
                          | (retry)  |  +----------+
                          +----------+
```

## Submitting Tasks

Create a task by sending a `POST /tasks` request:

```bash
curl -X POST http://localhost:3721/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project": "my-project",
    "type": "book:crawl",
    "payload": { "url": "https://example.com/book/123" },
    "priority": 8,
    "maxAttempts": 3,
    "scheduledAt": "2026-04-02T10:00:00Z"
  }'
```

| Field | Default | Description |
| --- | --- | --- |
| `project` | (required) | Project ID this task belongs to |
| `type` | (required) | Task type, matched to a plugin capability |
| `payload` | (required) | Arbitrary data passed to the plugin handler |
| `priority` | `5` | Priority from 1 (lowest) to 10 (highest) |
| `maxAttempts` | `3` | Maximum number of execution attempts |
| `scheduledAt` | now | Earliest time the task can be claimed |

## Claiming Tasks

Workers claim tasks via two mechanisms:

**HTTP Polling** -- The worker periodically calls `POST /tasks/claim`:

```json
{ "count": 10, "lease": "500s" }
```

The Hub returns up to `count` pending tasks, atomically marking them as `running` with a lease expiration.

**WebSocket Push** -- The Hub dispatches tasks directly to connected workers based on their registered capabilities.

## Lease Management

When a worker claims a task, it holds a **lease** -- a time-limited lock. If the worker fails to complete the task before the lease expires, the Reaper reclaims it.

Workers can extend their lease:

```bash
curl -X POST http://localhost:3721/tasks/lease/renew \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "taskIds": ["task-id-1"], "extend": "500s" }'
```

## Completing Tasks

Workers submit results via `POST /tasks/complete`:

```json
{
  "done": [
    { "id": "task-1", "result": { "strategy": "store", "data": { "title": "Example" } } }
  ],
  "failed": [
    { "id": "task-2", "error": "Connection timeout", "retryable": true }
  ]
}
```

- **Done tasks** are marked as `done` and their results are routed through the Result Plugin Runner.
- **Failed tasks** with `retryable: true` are reset to `pending` (if attempts remain). Otherwise they are marked as `failed`.

## The Reaper

The Reaper is a background loop that runs at a configurable interval (default: 30 seconds). It performs three tasks:

1. **Reclaims expired leases** -- Tasks with `running` status whose `leaseExpiresAt` has passed are reset to `pending` for retry (if `attempts < maxAttempts`).
2. **Marks exhausted tasks as failed** -- Tasks that have exceeded `maxAttempts` are moved to `failed` status.
3. **Cleans expired nonces** -- Removes expired entries from the anti-replay nonce cache.

## Priority and Scheduling

Tasks are claimed in order of:
1. **Priority** (highest first, 10 = highest)
2. **Creation time** (oldest first, FIFO within same priority)

Tasks with a future `scheduledAt` are not claimable until that time arrives. This enables deferred task execution.
