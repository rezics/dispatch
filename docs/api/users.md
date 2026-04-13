# Users

User management endpoints for the dashboard. All endpoints require the `admin:users` permission.

## List Users

```
POST /users 🔒
```

```
GET /users 🔒
```

Returns all users, ordered by creation date (newest first).

### Response `200`

```json
[
  {
    "id": "root",
    "isRoot": true,
    "passwordHash": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "createdBy": null
  }
]
```

---

## Create User

```
POST /users 🔒
```

Creates a new user. Only root users can create other root users.

### Request Body

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Unique user identifier (used as login username) |
| `isRoot` | `boolean` | No | Whether the user has root privileges. Default: `false` |

### Response `201`

```json
{
  "id": "new-user",
  "isRoot": false,
  "passwordHash": null,
  "createdAt": "2025-01-07T12:00:00.000Z",
  "createdBy": "root"
}
```

### Errors

| Status | Error | Cause |
| --- | --- | --- |
| `403` | `Only root users can create other root users` | Non-root user tried to create a root user |
| `409` | `User already exists` | A user with this ID already exists |
