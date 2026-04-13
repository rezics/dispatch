## ADDED Requirements

### Requirement: Worker authentication via JWT
Worker routes SHALL be protected by a middleware that extracts the Bearer JWT, verifies it against configured auth providers (JWKS), and resolves project access via access policies. No session cookie authentication is accepted on worker routes.

#### Scenario: Valid JWT with policy match
- **WHEN** a request to a worker route includes a valid Bearer JWT that matches at least one access policy
- **THEN** the request is authorized and the handler receives the worker's `sub` and accessible projects

#### Scenario: Valid JWT with no policy match
- **WHEN** a JWT is valid but matches no access policies
- **THEN** the hub returns HTTP 403 (authenticated but no project access)

#### Scenario: Invalid or expired JWT
- **WHEN** a worker route receives an invalid or expired JWT
- **THEN** the hub returns HTTP 401

#### Scenario: Session cookie on worker route
- **WHEN** a request to a worker route includes a session cookie but no Bearer JWT
- **THEN** the hub returns HTTP 401 (session cookies are not accepted for worker routes)

### Requirement: WorkerIdentity type
The worker auth middleware SHALL produce a `WorkerIdentity` type containing `sub: string` (from JWT) and `projects: string[] | '*'` (resolved from access policies). No permissions array.

#### Scenario: Worker identity has project list
- **WHEN** a JWT matches policies for projects "alpha" and "beta"
- **THEN** the route handler receives `{ sub: "worker-1", projects: ["alpha", "beta"] }`

#### Scenario: Worker identity with global access
- **WHEN** a JWT matches a policy with `projectScope: null`
- **THEN** the route handler receives `{ sub: "worker-1", projects: "*" }`

### Requirement: Project access check on worker routes
Worker route handlers that operate on a specific project SHALL verify the worker has access to that project. A worker with `projects: "*"` has access to all projects.

#### Scenario: Worker accesses allowed project
- **WHEN** a worker with `projects: ["alpha"]` calls `POST /tasks/claim` for project "alpha"
- **THEN** the request is authorized

#### Scenario: Worker accesses disallowed project
- **WHEN** a worker with `projects: ["alpha"]` calls `POST /tasks/claim` for project "beta"
- **THEN** the hub returns HTTP 403

#### Scenario: Global worker accesses any project
- **WHEN** a worker with `projects: "*"` calls `POST /tasks/claim` for any project
- **THEN** the request is authorized
