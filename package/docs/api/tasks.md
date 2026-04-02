# Tasks API

## Create a Task

Submit a new task to the queue.

```
POST /tasks
```

**Request Body:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `project` | `string` | Yes | | Project ID |
| `type` | `string` | Yes | | Task type (matched to plugin capabilities) |
| `payload` | `any` | Yes | | Data passed to the plugin handler |
| `priority` | `integer` | No | `5` | Priority 1-10 (10 = highest) |
| `maxAttempts` | `integer` | No | `3` | Maximum execution attempts |
| `scheduledAt` | `string` | No | now | ISO 8601 datetime for deferred execution |

**Example:**

```bash
curl -X POST http://localhost:3721/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project": "my-project",
    "type": "book:crawl",
    "payload": { "url": "https://example.com/book/123" },
    "priority": 8
  }'
```

**Response:** `201 Created`

```json
{
  "id": "a1b2c3d4-...",
  "project": "my-project",
  "type": "book:crawl",
  "payload": { "url": "https://example.com/book/123" },
  "priority": 8,
  "status": "pending",
  "workerId": null,
  "attempts": 0,
  "maxAttempts": 3,
  "scheduledAt": "2026-04-02T00:00:00.000Z",
  "startedAt": null,
  "leaseExpiresAt": null,
  "finishedAt": null,
  "error": null,
  "createdAt": "2026-04-02T00:00:00.000Z"
}
```

## List Tasks

List tasks with optional filters.

```
GET /tasks
```

**Query Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `project` | `string` | Filter by project ID |
| `status` | `string` | Filter by status (`pending`, `running`, `done`, `failed`) |
| `type` | `string` | Filter by task type |
| `limit` | `integer` | Results per page (1-1000, default: 50) |
| `offset` | `integer` | Results to skip (default: 0) |

**Example:**

```bash
curl "http://localhost:3721/tasks?project=my-project&status=pending&limit=10"
```

**Response:** `200 OK` -- Array of Task objects, ordered by priority (desc) then creation time (desc).

## Get Task by ID

Retrieve a single task. Includes real-time progress data when the task is running in WebSocket mode.

```
GET /tasks/:id
```

**Example:**

```bash
curl http://localhost:3721/tasks/a1b2c3d4-...
```

**Response:** `200 OK`

```json
{
  "id": "a1b2c3d4-...",
  "status": "running",
  "progress": {
    "percent": 45,
    "message": "Parsing book metadata"
  }
}
```

The `progress` field is only present for tasks running in WebSocket mode where the worker has reported progress.

## Claim Tasks

::: warning Authentication Required
This endpoint requires a Bearer JWT token.
:::

Claim a batch of pending tasks for processing. Used by workers in HTTP polling mode.

```
POST /tasks/claim
```

**Request Body:**

| Field | Type | Description |
| --- | --- | --- |
| `count` | `integer` | Number of tasks to claim (1-5000) |
| `lease` | `string` | Lease duration (e.g., `"500s"`) |

**Example:**

```bash
curl -X POST http://localhost:3721/tasks/claim \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "count": 10, "lease": "500s" }'
```

**Response:** `200 OK`

```json
{
  "tasks": [ /* array of Task objects */ ],
  "count": 3
}
```

## Renew Lease

::: warning Authentication Required
This endpoint requires a Bearer JWT token.
:::

Extend the lease on claimed tasks to prevent the Reaper from reclaiming them.

```
POST /tasks/lease/renew
```

**Request Body:**

| Field | Type | Description |
| --- | --- | --- |
| `taskIds` | `string[]` | IDs of tasks to renew |
| `extend` | `string` | Duration to extend (e.g., `"500s"`) |

**Example:**

```bash
curl -X POST http://localhost:3721/tasks/lease/renew \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "taskIds": ["task-1", "task-2"], "extend": "500s" }'
```

**Response:** `200 OK`

```json
{ "ok": true }
```

**Error:** `409 Conflict` if the lease has already expired.

## Complete Tasks

::: warning Authentication Required
This endpoint requires a Bearer JWT token.
:::

Submit task completion results. Include both successful and failed tasks in a single request.

```
POST /tasks/complete
```

**Request Body:**

| Field | Type | Description |
| --- | --- | --- |
| `done` | `array` | Successfully completed tasks |
| `done[].id` | `string` | Task ID |
| `done[].result` | `object` | [Result strategy](/plugins/result-strategies) |
| `failed` | `array` | Failed tasks |
| `failed[].id` | `string` | Task ID |
| `failed[].error` | `string` | Error message |
| `failed[].retryable` | `boolean` | Whether to retry the task |
| `receipt` | `object` | [CompletionReceipt](/guide/trust-and-verification) (required for `receipted` trust) |

**Example:**

```bash
curl -X POST http://localhost:3721/tasks/complete \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "done": [
      {
        "id": "task-1",
        "result": { "strategy": "store", "data": { "title": "Example Book" } }
      }
    ],
    "failed": [
      {
        "id": "task-2",
        "error": "Connection timeout",
        "retryable": true
      }
    ]
  }'
```

**Response:** `200 OK`

```json
{ "ok": true }
```
