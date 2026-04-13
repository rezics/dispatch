# Access Control & Verification

Dispatch separates two concerns: **access control** (who can use the system) and **verification** (how task completion is validated).

## Access Control

The Hub uses two independent authentication paths:

### Admin Auth (Dashboard & Management)

Admin users authenticate via **username/password**, receiving a session cookie. Only root users can access admin routes (project CRUD, policy management, user management). JWT tokens are not accepted for admin authentication.

### Worker Auth (Task Processing)

Workers authenticate via **Bearer JWT**. The Hub verifies the token against configured JWKS providers, then resolves project access using **access policies**. Workers can only interact with projects they have access to.

### Access Policies

Access policies map JWT claims to project access. When a Bearer JWT arrives, the Hub evaluates all policies to determine which projects the worker can access.

| Field | Description |
| --- | --- |
| `issPattern` | Glob pattern matched against the JWT `iss` claim (`*` matches a single segment, not dots) |
| `claimField` | The JWT claim to extract (e.g., `email`, `role`, `sub`) |
| `claimPattern` | Regex pattern tested against the extracted claim value |
| `projectScope` | Literal project ID. If omitted (`null`), the policy grants access to all projects. |

A matching policy means "this JWT is a worker on this project." All worker capabilities (register, claim, complete, renew lease) are implied by project access.

#### Resolution Flow

1. Load all access policies (cached for 30 seconds).
2. Iterate over policies:
   - Match `issPattern` against the token's `iss` claim.
   - Extract the value of `claimField` from the token.
   - Test `claimPattern` against the extracted value.
   - If match: add `projectScope` to the worker's project set (or grant global access if null).
3. Build a `WorkerIdentity` with the aggregated project access.

#### Scenarios

**Public dispatch, restricted processing:**
Create a policy scoped to a specific project. Workers matching the policy can only claim and complete tasks for that project.

**Global worker access:**
Create a policy with `projectScope: null`. Matching workers can access all current and future projects.

**Multi-project worker:**
Create multiple policies with different `projectScope` values. The worker's access is the union of all matched project scopes.

See [Access Policies API](/api/policies) for managing policies via the REST API.

---

## Verification Modes

Each project is configured with a verification mode that determines how task completion is validated. This is independent of access control.

### No Verification

```json
{ "id": "my-project", "verification": "none" }
```

Workers submit results directly without any cryptographic verification. The Hub accepts completion results at face value.

**When to use:** Internal workers running in a trusted environment where you control both the Hub and workers.

### Receipted Verification

```json
{ "id": "my-project", "verification": "receipted", "receiptSecret": "your-shared-secret" }
```

Workers must include a signed `CompletionReceipt` when completing tasks. The Hub verifies the HMAC-SHA256 signature against the project's shared secret.

**When to use:** Workers running in semi-trusted environments, or when you need an audit trail of task completions.

### Audited Verification

```json
{ "id": "my-project", "verification": "audited", "receiptSecret": "your-shared-secret" }
```

Workers cannot mark tasks as complete. Instead, an external **Main Server** calls `POST /tasks/audit` with a signed payload to confirm completion.

**When to use:** High-security scenarios where task completion must be independently verified by a trusted third party.

## Completion Receipt

For `receipted` verification, workers sign a `CompletionReceipt` containing:

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

For `audited` verification, the Main Server confirms task completion by calling:

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
