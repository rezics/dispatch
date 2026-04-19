## MODIFIED Requirements

### Requirement: Project mutation requires admin auth
`POST /projects`, `PATCH /projects/:id`, `DELETE /projects/:id`, and `DELETE /projects/:id/tasks` SHALL require admin authentication (root user via session cookie). `GET /projects` and `GET /projects/:id/stats` remain publicly accessible.

#### Scenario: Unauthenticated project creation rejected
- **WHEN** `POST /projects` is called without a session cookie
- **THEN** HTTP 401

#### Scenario: Root user creates project
- **WHEN** `POST /projects` is called with a valid root session cookie
- **THEN** the project is created and returned

#### Scenario: Unauthenticated project deletion rejected
- **WHEN** `DELETE /projects/:id` is called without a session cookie
- **THEN** HTTP 401

#### Scenario: Non-root user deletion rejected
- **WHEN** `DELETE /projects/:id` is called with a session cookie whose user has `isRoot: false`
- **THEN** HTTP 403

#### Scenario: Unauthenticated task clear rejected
- **WHEN** `DELETE /projects/:id/tasks` is called without a session cookie
- **THEN** HTTP 401

## ADDED Requirements

### Requirement: DELETE /projects/:id blocks when tasks exist
The hub SHALL expose `DELETE /projects/:id` which deletes the project only when it has zero associated tasks (regardless of status). When tasks exist, the endpoint SHALL return HTTP 409 with `{ error: string, taskCount: number }` and the project SHALL NOT be deleted.

#### Scenario: Delete empty project
- **WHEN** `DELETE /projects/:id` is called by a root user for a project with no tasks
- **THEN** HTTP 200 and the project row is removed

#### Scenario: Delete project with tasks blocked
- **WHEN** `DELETE /projects/:id` is called by a root user for a project with at least one task in any status
- **THEN** HTTP 409 with body `{ error, taskCount }` and the project remains

#### Scenario: Delete unknown project
- **WHEN** `DELETE /projects/:id` is called for a non-existent project id
- **THEN** HTTP 404

### Requirement: DELETE /projects/:id/tasks clears all tasks with typed confirmation
The hub SHALL expose `DELETE /projects/:id/tasks` which deletes every task row associated with the project, regardless of status. The request body SHALL include `{ confirm: string }` matching the target project id; a mismatch SHALL return HTTP 400 without performing any deletion. On success, the response SHALL include `{ deleted: number }`.

#### Scenario: Clear tasks with matching confirmation
- **WHEN** `DELETE /projects/crawl/tasks` is called by a root user with body `{ "confirm": "crawl" }` and the project has 42 tasks
- **THEN** HTTP 200 with `{ deleted: 42 }` and the project has zero tasks

#### Scenario: Clear tasks with mismatched confirmation
- **WHEN** `DELETE /projects/crawl/tasks` is called with body `{ "confirm": "other" }`
- **THEN** HTTP 400 and no tasks are deleted

#### Scenario: Clear tasks for unknown project
- **WHEN** `DELETE /projects/:id/tasks` is called for a non-existent project id
- **THEN** HTTP 404
