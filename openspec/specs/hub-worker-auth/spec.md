## Requirements

### Requirement: Worker authentication via JWT
Worker routes SHALL be protected by a middleware that extracts the Bearer JWT, looks up the target project from the request, and verifies the JWT against the project's `jwksUri`. No session cookie authentication is accepted on worker routes. No global auth providers or access policies are used.

#### Scenario: Valid JWT verified against project JWKS
- **WHEN** a request to a worker route includes a valid Bearer JWT and targets a project with a configured `jwksUri`
- **THEN** the request is authorized and the handler receives the worker's `sub` and project

#### Scenario: Invalid or expired JWT
- **WHEN** a worker route receives an invalid or expired JWT
- **THEN** the hub returns HTTP 401

#### Scenario: Session cookie on worker route
- **WHEN** a request to a worker route includes a session cookie but no Bearer JWT
- **THEN** the hub returns HTTP 401 (session cookies are not accepted for worker routes)

### Requirement: WorkerIdentity type
The worker auth middleware SHALL produce a `WorkerIdentity` type containing `sub: string` (from JWT) and `project: string` (the verified project). No `projects` array or `'*'` global access.

#### Scenario: Worker identity has single project
- **WHEN** a JWT with `sub: "worker-1"` is verified against project "alpha"
- **THEN** the route handler receives `{ sub: "worker-1", project: "alpha" }`

### Requirement: Project access check on worker routes
Worker route handlers that operate on a specific project SHALL verify the request's target project matches the authenticated project in `WorkerIdentity`.

#### Scenario: Worker accesses verified project
- **WHEN** a worker authenticated for project "alpha" calls `POST /tasks/claim` for project "alpha"
- **THEN** the request is authorized

#### Scenario: Worker accesses different project
- **WHEN** a worker authenticated for project "alpha" calls `POST /tasks/claim` for project "beta"
- **THEN** the hub returns HTTP 403
