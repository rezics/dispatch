## ADDED Requirements

### Requirement: Project-level aging configuration
The Project model SHALL support optional `agingRate` (float, priority points per day) and `agingMaxPriority` (integer, default 1000) fields. When `agingRate` is null, no aging occurs for that project's tasks.

#### Scenario: Project with aging enabled
- **WHEN** a project is configured with `agingRate: 1.0` and `agingMaxPriority: 500`
- **THEN** pending tasks in that project age by 1 priority point per day, capped at 500

#### Scenario: Project with aging disabled (default)
- **WHEN** a project has `agingRate: null`
- **THEN** no priority aging occurs for that project's tasks

### Requirement: Aging sweeper background loop
The hub SHALL run an aging sweeper on a configurable interval (default 300 seconds), separate from the lease reaper. The sweeper SHALL update `priority` for pending tasks in projects where `agingRate` is not null.

#### Scenario: Default aging interval
- **WHEN** the hub starts with no aging sweeper configuration override
- **THEN** the aging sweeper runs every 300 seconds

#### Scenario: Custom aging interval
- **WHEN** the hub is configured with `agingSweeper.interval: "600s"`
- **THEN** the aging sweeper runs every 600 seconds

### Requirement: Aging formula
The aging sweeper SHALL compute effective priority as `basePriority + FLOOR(agingRate * days_since_scheduledAt)`, capped at `agingMaxPriority`. The sweeper SHALL only update tasks where the stored `priority` is less than the computed value (diff-only updates to minimize writes).

#### Scenario: Task aged by one day
- **WHEN** a pending task has `basePriority: 5`, `scheduledAt` is 1 day ago, and the project has `agingRate: 2.0`
- **THEN** the aging sweeper sets `priority` to 7

#### Scenario: Task hits aging ceiling
- **WHEN** a pending task has `basePriority: 990`, `scheduledAt` is 30 days ago, and the project has `agingRate: 1.0, agingMaxPriority: 1000`
- **THEN** the aging sweeper sets `priority` to 1000 (not 1020)

#### Scenario: No-op when priority already current
- **WHEN** a pending task has `basePriority: 5`, `priority: 7`, `scheduledAt` is 2.5 days ago, and `agingRate: 1.0`
- **THEN** the computed priority is `5 + FLOOR(1.0 * 2.5) = 7`, which equals the stored value, so no update occurs

#### Scenario: Running tasks not aged
- **WHEN** a task has `status: "running"`
- **THEN** the aging sweeper does not modify its priority
