## ADDED Requirements

### Requirement: Permission constants module
The hub SHALL have a `permissions.ts` file that exports all valid permission strings as constants, organized by category: worker permissions (`worker:register`, `worker:unregister`, `task:claim`, `task:complete`), dashboard permissions (`dashboard:view`, `dashboard:projects`, `dashboard:workers`, `dashboard:tasks`, `dashboard:policies`), and admin permissions (`admin:users`, `admin:policies`, `admin:*`).

#### Scenario: All permissions are importable constants
- **WHEN** a route handler imports from `permissions.ts`
- **THEN** it can reference permission strings as typed constants (e.g. `PERMISSIONS.WORKER_REGISTER`)

#### Scenario: No magic strings in route guards
- **WHEN** a developer searches the codebase for permission checks
- **THEN** all permission references trace back to constants defined in `permissions.ts`

### Requirement: hasPermission helper
The module SHALL export a `hasPermission(identity: ResolvedIdentity, permission: string): boolean` function that returns true if the identity's permissions array contains the exact permission string or a matching wildcard (e.g. `admin:*` matches `admin:policies`).

#### Scenario: Exact permission match
- **WHEN** `hasPermission` is called with an identity having `["worker:register"]` and permission `"worker:register"`
- **THEN** it returns `true`

#### Scenario: Wildcard match
- **WHEN** `hasPermission` is called with an identity having `["admin:*"]` and permission `"admin:policies"`
- **THEN** it returns `true`

#### Scenario: No match
- **WHEN** `hasPermission` is called with an identity having `["dashboard:view"]` and permission `"admin:policies"`
- **THEN** it returns `false`

#### Scenario: Root user has all permissions
- **WHEN** `hasPermission` is called with an identity where `isRoot` is `true`
- **THEN** it returns `true` for any permission string

### Requirement: hasAnyPermission helper
The module SHALL export a `hasAnyPermission(identity: ResolvedIdentity, permissions: string[]): boolean` function that returns true if the identity has at least one of the listed permissions.

#### Scenario: One of many matches
- **WHEN** `hasAnyPermission` is called with permissions `["dashboard:view", "admin:*"]` and the identity has `["dashboard:view"]`
- **THEN** it returns `true`

### Requirement: isProjectScoped helper
The module SHALL export an `isProjectScoped(identity: ResolvedIdentity, projectId: string): boolean` function that returns true if the identity's project scope is `"*"` (all projects) or includes the given project ID.

#### Scenario: Global scope
- **WHEN** `isProjectScoped` is called with an identity having `projects: "*"` and any project ID
- **THEN** it returns `true`

#### Scenario: Specific project match
- **WHEN** `isProjectScoped` is called with an identity having `projects: ["book-crawler"]` and project ID `"book-crawler"`
- **THEN** it returns `true`

#### Scenario: Project not in scope
- **WHEN** `isProjectScoped` is called with an identity having `projects: ["book-crawler"]` and project ID `"anime-crawler"`
- **THEN** it returns `false`
