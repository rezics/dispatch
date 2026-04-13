# Projects API

Projects group tasks and workers under a shared configuration, including verification mode settings.

`GET` routes are public. `POST` and `PATCH` require admin authentication (root user via session cookie).

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
    "verification": "receipted",
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

Requires admin authentication.

**Request Body:**

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `id` | `string` | Yes | | Unique project identifier |
| `verification` | `string` | No | `"receipted"` | Verification mode: `none`, `receipted`, or `audited` |
| `receiptSecret` | `string` | No | | HMAC secret for receipt/audit verification |
| `jwksUri` | `string` | No | | JWKS URI for JWT verification |

**Example:**

```bash
curl -X POST http://localhost:3721/projects \
  -H "Cookie: dispatch_session=<session-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "crawler-project",
    "verification": "receipted",
    "receiptSecret": "my-secret-key"
  }'
```

**Response:** `201 Created`

## Update Project

```
PATCH /projects/:id
```

Requires admin authentication.

**Request Body:**

| Field | Type | Description |
| --- | --- | --- |
| `verification` | `string` | New verification mode |
| `receiptSecret` | `string` | New receipt secret |
| `jwksUri` | `string` | New JWKS URI |

**Example:**

```bash
curl -X PATCH http://localhost:3721/projects/crawler-project \
  -H "Cookie: dispatch_session=<session-token>" \
  -H "Content-Type: application/json" \
  -d '{ "verification": "audited" }'
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
