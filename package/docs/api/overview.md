# API Overview

The Dispatch Hub exposes a REST API for task management, worker registration, and project configuration.

## Base URL

```
http://localhost:3721
```

The default port is `3721`, configurable via the `PORT` environment variable.

## Authentication

Authenticated endpoints require a Bearer JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

Authenticated endpoints are marked with a lock icon in this documentation.

## Content Type

All request and response bodies use JSON:

```
Content-Type: application/json
```

## OpenAPI Documentation

The Hub serves interactive OpenAPI documentation at:

```
http://localhost:3721/openapi
```

This is auto-generated from the route definitions and always reflects the current API.

## Error Responses

Errors return a JSON object with an `error` field:

```json
{ "error": "Task not found" }
```

Common HTTP status codes:

| Status | Meaning |
| --- | --- |
| `200` | Success |
| `201` | Created |
| `400` | Invalid request body or parameters |
| `403` | Signature verification failed |
| `404` | Resource not found |
| `409` | Conflict (e.g., lease expired) |
| `500` | Internal server error |

## Pagination

List endpoints support `limit` and `offset` query parameters:

```
GET /tasks?project=my-project&limit=50&offset=100
```

| Parameter | Default | Max | Description |
| --- | --- | --- | --- |
| `limit` | `50` | `1000` | Number of results to return |
| `offset` | `0` | -- | Number of results to skip |

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | [`/tasks`](/api/tasks#create-a-task) | Create a task |
| `GET` | [`/tasks`](/api/tasks#list-tasks) | List tasks |
| `GET` | [`/tasks/:id`](/api/tasks#get-task-by-id) | Get a task |
| `POST` | [`/tasks/claim`](/api/tasks#claim-tasks) | Claim tasks |
| `POST` | [`/tasks/lease/renew`](/api/tasks#renew-lease) | Renew task lease |
| `POST` | [`/tasks/complete`](/api/tasks#complete-tasks) | Complete tasks |
| `POST` | [`/tasks/audit`](/api/audit) | Audit completion |
| `GET` | [`/workers`](/api/workers#list-workers) | List workers |
| `GET` | [`/workers/:id`](/api/workers#get-worker-by-id) | Get a worker |
| `DELETE` | [`/workers/:id`](/api/workers#remove-worker) | Remove a worker |
| `GET` | [`/projects`](/api/projects#list-projects) | List projects |
| `POST` | [`/projects`](/api/projects#create-project) | Create a project |
| `PATCH` | [`/projects/:id`](/api/projects#update-project) | Update a project |
| `GET` | [`/projects/:id/stats`](/api/projects#get-project-stats) | Get project stats |
| `WS` | [`/workers`](/api/websocket) | Worker WebSocket |
