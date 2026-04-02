# Trust & Verification

Dispatch supports three trust levels that control how task completion is verified. Each project is configured with a trust level that determines the verification requirements for its workers.

## Trust Levels

### Full Trust

```json
{ "id": "my-project", "trustLevel": "full" }
```

Workers submit results directly without any cryptographic verification. The Hub accepts completion results at face value.

**When to use:** Internal workers running in a trusted environment where you control both the Hub and workers.

### Receipted Trust

```json
{ "id": "my-project", "trustLevel": "receipted", "receiptSecret": "your-shared-secret" }
```

Workers must include a signed `CompletionReceipt` when completing tasks. The Hub verifies the HMAC-SHA256 signature against the project's shared secret.

**When to use:** Workers running in semi-trusted environments, or when you need an audit trail of task completions.

### Audited Trust

```json
{ "id": "my-project", "trustLevel": "audited", "receiptSecret": "your-shared-secret" }
```

Workers cannot mark tasks as complete. Instead, an external **Main Server** calls `POST /tasks/audit` with a signed payload to confirm completion.

**When to use:** High-security scenarios where task completion must be independently verified by a trusted third party.

## Completion Receipt

For `receipted` trust, workers sign a `CompletionReceipt` containing:

```typescript
interface CompletionReceipt {
  taskIds: string[]    // IDs of completed tasks (sorted)
  workerId: string     // Worker that executed the tasks
  project: string      // Project ID
  issuedAt: number     // Unix timestamp when receipt was created
  expiresAt: number    // Unix timestamp when receipt expires
  nonce: string        // Unique value to prevent replay attacks
  signature: string    // HMAC-SHA256 hex signature
}
```

### Signing Process

The signature is computed over a JSON payload of all receipt fields (excluding the signature itself), using HMAC-SHA256 with the project's shared secret:

```typescript
import { signReceipt } from '@rezics/dispatch-type'

const receipt = await signReceipt(
  {
    taskIds: ['task-1', 'task-2'],
    workerId: 'worker-abc',
    project: 'my-project',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    nonce: crypto.randomUUID(),
  },
  'your-shared-secret',
)
```

The `taskIds` are sorted before signing to ensure consistent signatures regardless of submission order.

### Anti-Replay Protection

Each receipt includes a `nonce` that must be unique per project. The Hub stores used nonces in the `UsedNonce` table and rejects any receipt with a previously seen nonce. Expired nonces are cleaned up by the Reaper.

## Audit Endpoint

For `audited` trust, the Main Server confirms task completion by calling:

```bash
curl -X POST http://localhost:3721/tasks/audit \
  -H "Content-Type: application/json" \
  -d '{
    "taskIds": ["task-1", "task-2"],
    "project": "my-project",
    "signature": "<hmac-sha256-hex>"
  }'
```

The signature is computed over `JSON.stringify({ taskIds: sortedTaskIds, project })` using the project's `receiptSecret`.
