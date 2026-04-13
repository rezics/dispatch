# Auth

The Auth endpoints manage dashboard sessions. Authentication supports two methods: JWT Bearer tokens and username/password credentials.

## Login

```
POST /auth/login
```

Authenticate and create a dashboard session. On success, sets an `HttpOnly` session cookie (`dispatch_session`) and returns a session token.

**Two authentication paths:**

### Bearer JWT

Include a JWT in the `Authorization` header. The token is verified against configured auth providers. The JWT `sub` claim must match a root user in the database.

```bash
curl -X POST http://localhost:3721/auth/login \
  -H "Authorization: Bearer <jwt-token>"
```

### Username / Password

Submit credentials in the request body. The user must exist, have a password set, and be a root user.

```bash
curl -X POST http://localhost:3721/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "username": "root", "password": "your-password" }'
```

### Request Body (password path)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `username` | `string` | Yes | User ID |
| `password` | `string` | Yes | User password |

### Response `200`

```json
{
  "token": "a1b2c3...",
  "expiresAt": "2025-01-14T12:00:00.000Z"
}
```

Sessions expire after 7 days. The response also sets a `dispatch_session` cookie (`HttpOnly`, `SameSite=Strict`, `Secure` in production).

### Errors

| Status | Error | Cause |
| --- | --- | --- |
| `401` | `Invalid token` / `Token expired` | JWT verification failed |
| `401` | `Missing credentials` | No Bearer token and no username/password |
| `401` | `Invalid credentials` | User not found or wrong password |
| `403` | `Dashboard login requires root` | User exists but is not a root user |

---

## Current User

```
GET /auth/me
```

Returns the authenticated user from the session cookie.

### Response `200`

```json
{
  "sub": "root",
  "isRoot": true,
  "permissions": ["*"]
}
```

### Errors

| Status | Error | Cause |
| --- | --- | --- |
| `401` | `Not authenticated` | No session cookie |
| `401` | `Session expired` | Session has expired |

---

## Logout

```
POST /auth/logout
```

Deletes the current session and clears the session cookie.

### Response `200`

```json
{ "ok": true }
```
