## ADDED Requirements

### Requirement: Admin routes require root session
The following routes SHALL require admin authentication (root user via session cookie):

- `POST /projects` (create project)
- `PATCH /projects/:id` (update project)
- `DELETE /workers/:id` (disconnect worker)
- `GET /policies`, `POST /policies`, `PATCH /policies/:id`, `DELETE /policies/:id` (policy CRUD)
- `GET /users`, `POST /users` (user management)

#### Scenario: Unauthenticated request to admin route
- **WHEN** `POST /projects` is called without a session cookie
- **THEN** the hub returns HTTP 401

#### Scenario: Root user creates project
- **WHEN** `POST /projects` is called with a valid root session
- **THEN** the project is created

### Requirement: Worker routes require JWT with project access
The following routes SHALL require worker authentication (JWT with project access):

- `POST /tasks/claim`
- `POST /tasks/complete`
- `POST /tasks/lease/renew`
- `WS /workers`

#### Scenario: Worker claims tasks with valid JWT
- **WHEN** `POST /tasks/claim` is called with a valid JWT that has access to the requested project
- **THEN** the claim is processed

#### Scenario: Worker without project access
- **WHEN** `POST /tasks/claim` is called with a valid JWT that lacks access to the requested project
- **THEN** the hub returns HTTP 403

### Requirement: Public routes require no authentication
The following routes SHALL remain publicly accessible without authentication:

- `POST /tasks` (submit task)
- `GET /tasks` (list tasks)
- `GET /tasks/:id` (get task)
- `POST /tasks/audit` (signature-verified, not JWT-verified)
- `GET /projects` (list projects)
- `GET /projects/:id/stats` (project stats)
- `GET /workers` (list workers)
- `GET /workers/:id` (get worker)

#### Scenario: Task submitted without auth
- **WHEN** `POST /tasks` is called without any authentication
- **THEN** the task is created

#### Scenario: Projects listed without auth
- **WHEN** `GET /projects` is called without any authentication
- **THEN** the project list is returned
