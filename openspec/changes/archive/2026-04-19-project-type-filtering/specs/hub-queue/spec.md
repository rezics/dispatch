## ADDED Requirements

### Requirement: HTTP claim supports type filtering
The HTTP claim endpoint SHALL accept an optional `type` parameter. When provided, only tasks matching that type are eligible for claiming. When omitted, all task types are eligible (current behavior).

#### Scenario: Claim with type filter
- **WHEN** a worker calls `POST /tasks/claim` with `{ project: "alpha", type: "email", count: 5, lease: "300s" }`
- **THEN** only pending tasks with `type: "email"` in project "alpha" are claimed

#### Scenario: Claim without type filter
- **WHEN** a worker calls `POST /tasks/claim` with `{ project: "alpha", count: 5, lease: "300s" }` (no type)
- **THEN** all pending tasks in project "alpha" are eligible regardless of type

#### Scenario: Claim with type filter but no matching tasks
- **WHEN** a worker claims with `type: "push"` but no pending tasks of that type exist
- **THEN** an empty array is returned
