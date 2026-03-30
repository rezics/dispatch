## ADDED Requirements

### Requirement: Configurable retention period
The hub SHALL support a `TASK_RETENTION_DAYS` environment variable (default 30) that defines how long completed and failed tasks are kept before cleanup.

#### Scenario: Default retention
- **WHEN** `TASK_RETENTION_DAYS` is not set
- **THEN** tasks older than 30 days with status `done` or `failed` are eligible for cleanup

#### Scenario: Custom retention
- **WHEN** `TASK_RETENTION_DAYS=90` is set
- **THEN** only tasks older than 90 days are eligible

### Requirement: Retention cleanup runs in reaper loop
The retention cleanup SHALL run as part of the existing reaper loop, after lease expiry and nonce cleanup. It processes tasks in batches to avoid long-running transactions.

#### Scenario: Batch cleanup
- **WHEN** the reaper runs and 50,000 tasks are eligible for cleanup with `TASK_RETENTION_BATCH_SIZE=10000`
- **THEN** 10,000 tasks are deleted per reaper cycle, completing over 5 cycles

### Requirement: Cleanup deletes associated task_result rows
When a task is deleted by retention cleanup, its associated `task_result` row (if any) SHALL also be deleted (via cascade or explicit delete).

#### Scenario: Result cleaned up
- **WHEN** a completed task with a stored result is deleted by retention
- **THEN** the corresponding `task_result` row is also deleted

### Requirement: Partition drop for partitioned tables
When the task table is partitioned, the retention cleanup SHALL drop entire partitions older than the retention period instead of row-by-row deletion.

#### Scenario: Partition dropped
- **WHEN** the task table is partitioned and the `task_2025_10` partition is entirely older than the retention period
- **THEN** the partition is dropped as a whole

### Requirement: Retention cleanup can be disabled
Setting `TASK_RETENTION_DAYS=0` SHALL disable the retention cleanup entirely.

#### Scenario: Cleanup disabled
- **WHEN** `TASK_RETENTION_DAYS=0` is set
- **THEN** no completed/failed tasks are ever deleted by the reaper

### Requirement: Cleanup logs summary
Each retention cleanup run SHALL log the number of tasks deleted (or partitions dropped) at info level.

#### Scenario: Cleanup logged
- **WHEN** the retention cleanup deletes 10,000 tasks
- **THEN** an info log is emitted: "Retention cleanup: deleted 10,000 tasks"
