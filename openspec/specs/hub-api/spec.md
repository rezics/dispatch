## ADDED Requirements

### Requirement: POST /tasks creates tasks
The hub SHALL expose `POST /tasks` accepting a JSON body with `project`, `type`, `payload`, and optional `priority`, `maxAttempts`, `scheduledAt`. Returns the created task with HTTP 201.

#### Scenario: Create task with minimal fields
- **WHEN** `POST /tasks` with `{ "project": "crawl", "type": "book:crawl", "payload": { "url": "https://example.com" } }`
- **THEN** HTTP 201 with the created task including generated `id` and default `priority: 5`

#### Scenario: Invalid body rejected
- **WHEN** `POST /tasks` with missing `type` field
- **THEN** HTTP 400 with validation error details

### Requirement: GET /tasks lists tasks
The hub SHALL expose `GET /tasks` with query parameters for filtering: `project`, `status`, `type`, `limit` (default 50, max 1000), `offset`.

#### Scenario: Filter by status
- **WHEN** `GET /tasks?project=crawl&status=pending`
- **THEN** HTTP 200 with only pending tasks for the crawl project

### Requirement: GET /tasks/:id returns single task
The hub SHALL expose `GET /tasks/:id` returning the task or HTTP 404.

#### Scenario: Task found
- **WHEN** `GET /tasks/valid-uuid`
- **THEN** HTTP 200 with the task object

#### Scenario: Task not found
- **WHEN** `GET /tasks/nonexistent-uuid`
- **THEN** HTTP 404

### Requirement: POST /tasks/claim claims a batch
The hub SHALL expose `POST /tasks/claim` accepting `{ count, lease }` from authenticated workers. Returns claimed tasks.

#### Scenario: Successful claim
- **WHEN** an authenticated worker sends `POST /tasks/claim { "count": 100, "lease": "500s" }`
- **THEN** HTTP 200 with `{ "tasks": [...], "count": N }` where N <= 100

#### Scenario: No tasks available
- **WHEN** a worker claims but no pending tasks match its project
- **THEN** HTTP 200 with `{ "tasks": [], "count": 0 }`

### Requirement: POST /tasks/lease/renew extends leases
The hub SHALL expose `POST /tasks/lease/renew` accepting `{ taskIds, extend }`.

#### Scenario: Successful renewal
- **WHEN** a worker renews lease for its own running tasks
- **THEN** HTTP 200 and `leaseExpiresAt` is extended

### Requirement: POST /tasks/complete submits results
The hub SHALL expose `POST /tasks/complete` accepting `{ done, failed }` arrays.

#### Scenario: Mixed completion
- **WHEN** a worker submits `{ "done": [{ "id": "t1", "result": { "strategy": "discard" } }], "failed": [{ "id": "t2", "error": "timeout", "retryable": true }] }`
- **THEN** HTTP 200, t1 marked done, t2 retried or failed based on attempts

### Requirement: GET /workers lists connected workers
The hub SHALL expose `GET /workers` returning all registered worker records.

#### Scenario: Workers listed
- **WHEN** `GET /workers`
- **THEN** HTTP 200 with array of worker objects including capabilities and lastSeen

### Requirement: GET /workers/:id returns worker detail
The hub SHALL expose `GET /workers/:id` returning the worker and its active tasks, or HTTP 404.

#### Scenario: Worker with active tasks
- **WHEN** `GET /workers/w1` and w1 has 3 running tasks
- **THEN** HTTP 200 with worker details and the 3 active task objects

### Requirement: DELETE /workers/:id force disconnects
The hub SHALL expose `DELETE /workers/:id` which removes the worker record. Active tasks are reclaimed by the reaper on next run.

#### Scenario: Worker removed
- **WHEN** `DELETE /workers/w1`
- **THEN** HTTP 200, worker record deleted, running tasks remain for reaper cleanup

### Requirement: GET /projects lists projects
The hub SHALL expose `GET /projects` returning all project records.

#### Scenario: Projects listed
- **WHEN** `GET /projects`
- **THEN** HTTP 200 with array of project objects

### Requirement: POST /projects registers a project
The hub SHALL expose `POST /projects` accepting `{ id, trustLevel, receiptSecret?, jwksUri? }`.

#### Scenario: Project creation
- **WHEN** `POST /projects { "id": "crawl", "trustLevel": "full" }`
- **THEN** HTTP 201 with the created project

### Requirement: PATCH /projects/:id updates a project
The hub SHALL expose `PATCH /projects/:id` for updating `trustLevel`, `receiptSecret`, `jwksUri`.

#### Scenario: Update trust level
- **WHEN** `PATCH /projects/crawl { "trustLevel": "receipted" }`
- **THEN** HTTP 200 with the updated project

### Requirement: GET /projects/:id/stats returns queue stats
The hub SHALL expose `GET /projects/:id/stats` returning counts of tasks by status and basic throughput metrics.

#### Scenario: Stats returned
- **WHEN** `GET /projects/crawl/stats`
- **THEN** HTTP 200 with `{ "pending": N, "running": N, "done": N, "failed": N }`

### Requirement: Request validation via Elysia
All API endpoints SHALL validate request bodies and query parameters using Elysia's built-in validation (backed by TypeBox/Zod). Invalid requests return HTTP 400 with structured error details.

#### Scenario: Malformed JSON rejected
- **WHEN** a request body contains invalid JSON
- **THEN** HTTP 400 with a parse error message

### Requirement: All worker endpoints require authentication
Endpoints under `/tasks/claim`, `/tasks/lease/renew`, `/tasks/complete` SHALL require a valid JWT. Unauthenticated requests receive HTTP 401.

#### Scenario: Missing auth header
- **WHEN** `POST /tasks/claim` is called without an Authorization header
- **THEN** HTTP 401

### Requirement: OpenAPI documentation at /openapi
The hub SHALL serve auto-generated OpenAPI documentation at `/openapi` (interactive UI via Scalar) and the raw spec at `/openapi/json` using `@elysiajs/openapi`. The spec SHALL include all public endpoints with descriptions, request/response schemas, and tag groupings.

#### Scenario: OpenAPI UI accessible
- **WHEN** `GET /openapi` is requested in a browser
- **THEN** an interactive API documentation page (Scalar) is rendered showing all endpoints

#### Scenario: OpenAPI JSON spec valid
- **WHEN** `GET /openapi/json` is requested
- **THEN** HTTP 200 with a valid OpenAPI 3.x JSON document containing paths for `/tasks`, `/workers`, and `/projects` groups

### Requirement: API endpoints tagged for OpenAPI grouping
Each route group SHALL declare an OpenAPI tag via Elysia's `detail` property: `Tasks` for task endpoints, `Workers` for worker endpoints, `Projects` for project endpoints. Auth-guarded endpoints SHALL declare the Bearer security scheme.

#### Scenario: Tag grouping in spec
- **WHEN** the OpenAPI spec is generated
- **THEN** endpoints are grouped under `Tasks`, `Workers`, and `Projects` tags

#### Scenario: Security scheme on guarded endpoints
- **WHEN** the OpenAPI spec is generated for `/tasks/claim`
- **THEN** the endpoint declares a `Bearer` security requirement

### Requirement: CORS enabled via plugin
The hub SHALL use `@elysiajs/cors` to handle cross-origin requests. In development, all origins are allowed. In production, origins SHALL be configurable via environment variable.

#### Scenario: Preflight request handled
- **WHEN** an OPTIONS preflight request is received from any origin in development
- **THEN** HTTP 200 with appropriate CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`)

### Requirement: Server timing in development
The hub SHALL use `@elysiajs/server-timing` to expose performance metrics in development mode only (disabled when `NODE_ENV=production`).

#### Scenario: Timing headers in development
- **WHEN** a request is made with `NODE_ENV=development`
- **THEN** the response includes a `Server-Timing` header with handler duration metrics

#### Scenario: No timing headers in production
- **WHEN** a request is made with `NODE_ENV=production`
- **THEN** the response does NOT include a `Server-Timing` header

### Requirement: Prismabox-generated models used for validation
Route handlers SHALL use prismabox-generated TypeBox models (registered as Elysia reference models) for request body and response validation, ensuring database schema and API validation stay in sync.

#### Scenario: Model consistency
- **WHEN** a new field is added to the Prisma `Task` model and `prisma generate` is re-run
- **THEN** the corresponding Elysia validation model is automatically updated without manual schema changes
