# Access Policies

Access policies control how JWT claims are mapped to project access for workers. A matching policy grants a worker access to the specified project -- all worker capabilities (register, claim, complete, renew lease) are implied.

All endpoints require admin authentication (root user via session cookie).

## How Policies Work

When a request arrives with a Bearer JWT, the Hub resolves the worker's project access by matching the token's claims against access policies:

1. **Issuer matching** -- The policy's `issPattern` is compared against the token's `iss` claim using glob matching (`*` matches a single segment, not dots).
2. **Claim extraction** -- The value of the JWT field named by `claimField` is read.
3. **Pattern matching** -- The extracted value is tested against `claimPattern` (a regular expression).
4. **Project grant** -- If both match, the worker is granted access to the project specified by `projectScope`.

If multiple policies match, the worker's access is the union of all matched project scopes. If any matched policy has `projectScope: null`, the worker has global access.

Policies are cached in memory for 30 seconds. Creating, updating, or deleting a policy immediately invalidates the cache.

---

## List Policies

```
GET /policies
```

Returns all access policies, ordered by creation date (newest first).

### Response `200`

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "issPattern": "accounts.google.com",
    "claimField": "email",
    "claimPattern": ".*@mycompany\\.com$",
    "projectScope": "my-project",
    "createdBy": "root",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
]
```

---

## Create Policy

```
POST /policies
```

### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `issPattern` | `string` | Yes | Glob pattern to match the JWT `iss` claim |
| `claimField` | `string` | Yes | JWT claim field to extract (e.g., `email`, `role`, `sub`) |
| `claimPattern` | `string` | Yes | Regex pattern to test against the extracted claim value |
| `projectScope` | `string` | No | Literal project ID to grant access to. If omitted, grants access to all projects. |

### Response `201`

Returns the created policy object.

### Example

Grant project access to any Google-issued JWT with a `@mycompany.com` email, scoped to `my-project`:

```bash
curl -X POST http://localhost:3721/policies \
  -H "Cookie: dispatch_session=<session-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "issPattern": "accounts.google.com",
    "claimField": "email",
    "claimPattern": ".*@mycompany\\.com$",
    "projectScope": "my-project"
  }'
```

---

## Update Policy

```
PATCH /policies/:id
```

Updates one or more fields on an existing policy. Only include the fields you want to change.

### Request Body

All fields are optional:

| Field | Type | Description |
| --- | --- | --- |
| `issPattern` | `string` | New issuer glob pattern |
| `claimField` | `string` | New claim field |
| `claimPattern` | `string` | New claim regex pattern |
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
DELETE /policies/:id
```

### Response `200`

```json
{ "ok": true }
```

### Errors

| Status | Error | Cause |
| --- | --- | --- |
| `404` | `Policy not found` | No policy with this ID |
