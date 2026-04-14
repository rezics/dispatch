## ADDED Requirements

### Requirement: Aging sweeper runs on separate interval
The hub SHALL run a priority aging sweeper on a configurable interval (default 300 seconds), independent of the lease reaper loop. The sweeper SHALL be started alongside the reaper at hub startup and stopped on shutdown.

#### Scenario: Aging sweeper starts with hub
- **WHEN** the hub starts
- **THEN** both the lease reaper (30s default) and aging sweeper (300s default) begin running on their respective intervals

#### Scenario: Aging sweeper shutdown
- **WHEN** the hub shuts down
- **THEN** both the reaper and aging sweeper timers are cleared

### Requirement: Aging sweeper updates stale pending task priorities
The aging sweeper SHALL update `priority` for all pending tasks in projects where `agingRate` is not null. The effective priority is computed as `basePriority + FLOOR(agingRate * days_elapsed_since_scheduledAt)`, capped at the project's `agingMaxPriority`. Only tasks where the stored `priority` is less than the computed value SHALL be updated (diff-only).

#### Scenario: Bulk aging across projects
- **WHEN** the aging sweeper runs and project A has `agingRate: 1.0` with 100 stale pending tasks, and project B has `agingRate: null`
- **THEN** only project A's tasks are evaluated, and only those whose computed priority exceeds their stored priority are updated

#### Scenario: No writes when nothing changed
- **WHEN** the aging sweeper runs and all pending tasks already have `priority` equal to or greater than the computed value
- **THEN** zero rows are updated
