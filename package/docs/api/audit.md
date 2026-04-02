# Audit API

The audit endpoint is used with the `audited` [trust level](/guide/trust-and-verification). It allows an external Main Server to mark tasks as completed, rather than trusting the worker to self-report.

## Audit Completion

```
POST /tasks/audit
```

**Request Body:**

| Field | Type | Description |
| --- | --- | --- |
| `taskIds` | `string[]` | IDs of tasks to mark as done |
| `project` | `string` | Project ID |
| `signature` | `string` | HMAC-SHA256 hex signature |

### Signature Computation

The signature is computed over a JSON string of the sorted task IDs and project:

```typescript
const payload = JSON.stringify({
  taskIds: taskIds.slice().sort(),
  project: 'my-project',
})

const key = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(receiptSecret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign'],
)

const buffer = await crypto.subtle.sign(
  'HMAC',
  key,
  new TextEncoder().encode(payload),
)

const signature = Array.from(new Uint8Array(buffer))
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('')
```

**Example:**

```bash
curl -X POST http://localhost:3721/tasks/audit \
  -H "Content-Type: application/json" \
  -d '{
    "taskIds": ["task-1", "task-2"],
    "project": "my-project",
    "signature": "a1b2c3d4..."
  }'
```

**Response:** `200 OK`

```json
{ "ok": true, "completed": 2 }
```

**Errors:**

| Status | Condition |
| --- | --- |
| `400` | Project trust level is not `audited` |
| `403` | Signature verification failed |
| `404` | Project not found |
| `500` | Project has no receipt secret configured |
