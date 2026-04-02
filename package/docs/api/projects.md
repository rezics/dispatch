# Projects API

Projects group tasks and workers under a shared configuration, including trust level settings.

## List Projects

```
GET /projects
```

**Example:**

```bash
curl http://localhost:3721/projects
```

**Response:** `200 OK`

```json
[
  {
    "id": "my-project",
    "trustLevel": "receipted",
    "receiptSecret": "secret-key",
    "jwksUri": null,
    "createdAt": "2026-04-02T00:00:00.000Z"
  }
]
```

## Create Project

```
POST /projects
```

**Request Body:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | `string` | Yes | | Unique project identifier |
| `trustLevel` | `string` | No | `"receipted"` | Trust level: `full`, `receipted`, or `audited` |
| `receiptSecret` | `string` | No | | HMAC secret for receipt/audit verification |
| `jwksUri` | `string` | No | | JWKS URI for JWT verification |

**Example:**

```bash
curl -X POST http://localhost:3721/projects \
  -H "Content-Type: application/json" \
  -d '{
    "id": "crawler-project",
    "trustLevel": "receipted",
    "receiptSecret": "my-secret-key"
  }'
```

**Response:** `201 Created`

## Update Project

```
PATCH /projects/:id
```

**Request Body:**

| Field | Type | Description |
| --- | --- | --- |
| `trustLevel` | `string` | New trust level |
| `receiptSecret` | `string` | New receipt secret |
| `jwksUri` | `string` | New JWKS URI |

**Example:**

```bash
curl -X PATCH http://localhost:3721/projects/crawler-project \
  -H "Content-Type: application/json" \
  -d '{ "trustLevel": "audited" }'
```

**Response:** `200 OK` -- Updated project object.

## Get Project Stats

Get a breakdown of task counts by status for a project.

```
GET /projects/:id/stats
```

**Example:**

```bash
curl http://localhost:3721/projects/crawler-project/stats
```

**Response:** `200 OK`

```json
{
  "pending": 42,
  "running": 8,
  "done": 1523,
  "failed": 7
}
```
