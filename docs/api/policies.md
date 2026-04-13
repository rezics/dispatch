# Trust Policies

Trust policies control how JWT claims are mapped to permissions. They enable fine-grained authorization for workers and dashboard users authenticated via external identity providers.

All endpoints require the `admin:policies` permission.

## How Policies Work

When a request arrives with a Bearer JWT, the Hub resolves the caller's identity by matching the token's claims against trust policies:

1. **Issuer matching** -- The policy's `issPattern` is compared against the token's `iss` claim using glob matching (`*` matches a single segment, not dots).
2. **Claim extraction** -- The value of the JWT field named by `claimField` is read.
3. **Pattern matching** -- The extracted value is tested against `claimPattern` (a regular expression).
4. **Permission grant** -- If both match, the policy's `permissions` are granted to the caller.

Policies are cached in memory for 30 seconds. Creating, updating, or deleting a policy immediately invalidates the cache.

---

## List Policies

```
GET /policies 🔒
```

Returns all trust policies, ordered by creation date (newest first).

### Response `200`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "issPattern": "accounts.google.com",
    "claimField": "email",
    "claimPattern": ".*@mycompany\\.com$",
    "permissions": ["worker:register", "task:claim", "task:complete"],
    "projectScope": "my-project",
    "createdBy": "root",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

## Create Policy

```
POST /policies 🔒
```

### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `issPattern` | `string` | Yes | Glob pattern to match the JWT `iss` claim |
| `claimField` | `string` | Yes | JWT claim field to extract (e.g., `email`, `role`, `sub`) |
| `claimPattern` | `string` | Yes | Regex pattern to test against the extracted claim value |
| `permissions` | `string[]` | Yes | Permissions to grant when the policy matches |
| `projectScope` | `string` | No | Restrict the policy to a specific project. If omitted, the policy applies globally. |

### Response `201`

Returns the created policy object.

### Example

Grant worker permissions to any Google-issued JWT with a `@mycompany.com` email, scoped to `my-project`:

```bash
curl -X POST http://localhost:3721/policies \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "issPattern": "accounts.google.com",
    "claimField": "email",
    "claimPattern": ".*@mycompany\\.com$",
    "permissions": ["worker:register", "task:claim", "task:complete"],
    "projectScope": "my-project"
  }'
```

---

## Update Policy

```
PATCH /policies/:id 🔒
```

Updates one or more fields on an existing policy. Only include the fields you want to change.

### Request Body

All fields are optional:

| Field | Type | Description |
| --- | --- | --- |
| `issPattern` | `string` | New issuer glob pattern |
| `claimField` | `string` | New claim field |
| `claimPattern` | `string` | New claim regex pattern |
| `permissions` | `string[]` | New permissions list |
| `projectScope` | `string \| null` | New project scope, or `null` for global |

### Response `200`

Returns the updated policy object.

### Errors

| Status | Error | Cause |
| --- | --- | --- |
| `404` | `Policy not found` | No policy with this ID |

---

## Delete Policy

```
DELETE /policies/:id 🔒
```

### Response `200`

```json
{ "ok": true }
```

### Errors

| Status | Error | Cause |
| --- | --- | --- |
| `404` | `Policy not found` | No policy with this ID |

---

## Available Permissions

| Permission | Description |
| --- | --- |
| `worker:register` | Register a worker connection |
| `worker:unregister` | Unregister a worker |
| `task:claim` | Claim tasks from the queue |
| `task:complete` | Submit task completion results |
| `dashboard:view` | View the dashboard |
| `dashboard:projects` | View projects in the dashboard |
| `dashboard:workers` | View workers in the dashboard |
| `dashboard:tasks` | View tasks in the dashboard |
| `dashboard:policies` | View policies in the dashboard |
| `admin:users` | Manage users |
| `admin:policies` | Manage trust policies |
| `admin:*` | All admin permissions (wildcard) |

Root users bypass all permission checks.
