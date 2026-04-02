# Workers API

## List Workers

List all registered workers, ordered by most recently seen.

```
GET /workers
```

**Example:**

```bash
curl http://localhost:3721/workers
```

**Response:** `200 OK`

```json
[
  {
    "id": "worker-abc",
    "project": "my-project",
    "capabilities": ["book:crawl", "book:update"],
    "concurrency": 10,
    "mode": "ws",
    "metadata": null,
    "connectedAt": "2026-04-02T00:00:00.000Z",
    "lastSeen": "2026-04-02T01:00:00.000Z"
  }
]
```

## Get Worker by ID

Retrieve a worker and its currently running tasks.

```
GET /workers/:id
```

**Example:**

```bash
curl http://localhost:3721/workers/worker-abc
```

**Response:** `200 OK`

```json
{
  "id": "worker-abc",
  "project": "my-project",
  "capabilities": ["book:crawl", "book:update"],
  "concurrency": 10,
  "mode": "ws",
  "metadata": null,
  "connectedAt": "2026-04-02T00:00:00.000Z",
  "lastSeen": "2026-04-02T01:00:00.000Z",
  "tasks": [
    {
      "id": "task-1",
      "type": "book:crawl",
      "status": "running",
      "startedAt": "2026-04-02T00:30:00.000Z"
    }
  ]
}
```

## Remove Worker

Force disconnect a worker. Any tasks currently assigned to the worker will be reclaimed by the Reaper when their leases expire.

```
DELETE /workers/:id
```

**Example:**

```bash
curl -X DELETE http://localhost:3721/workers/worker-abc
```

**Response:** `200 OK`

```json
{ "ok": true }
```
