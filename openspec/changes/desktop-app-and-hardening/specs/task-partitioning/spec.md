## ADDED Requirements

### Requirement: Task table partitioned by created_at monthly
The hub SHALL support PostgreSQL declarative range partitioning on the `task` table by `created_at` with monthly partitions. Each partition covers one calendar month.

#### Scenario: New task goes to correct partition
- **WHEN** a task is created on 2026-03-15
- **THEN** it is stored in the `task_2026_03` partition

### Requirement: Automatic partition creation
The hub's reaper loop SHALL check for and create upcoming partitions (3 months ahead) if they don't already exist, ensuring tasks are never inserted into a missing partition.

#### Scenario: Future partition auto-created
- **WHEN** the current month is March 2026 and partitions exist through May 2026
- **THEN** the reaper creates the June 2026 partition

#### Scenario: Missing partition caught
- **WHEN** a task would be inserted but the target month's partition doesn't exist
- **THEN** the partition maintenance runs immediately to create it before the insert fails

### Requirement: Old partitions can be dropped
The retention cleanup job SHALL support dropping entire partitions older than the retention period instead of row-by-row deletion, enabling fast, lock-free cleanup of millions of rows.

#### Scenario: Drop old partition
- **WHEN** the retention period is 90 days and partition `task_2025_11` is older than 90 days
- **THEN** the entire partition is dropped in a single DDL operation

### Requirement: SKIP LOCKED works across partitions
The `SKIP LOCKED` claim query SHALL work correctly across partitioned tables, claiming tasks from any active partition.

#### Scenario: Claim spans partitions
- **WHEN** pending tasks exist in both `task_2026_02` and `task_2026_03`
- **THEN** the claim query returns tasks from both partitions ordered by priority

### Requirement: Migration path from unpartitioned table
A Prisma migration SHALL be provided that converts an existing unpartitioned `task` table to a partitioned one using rename-and-copy strategy with minimal downtime.

#### Scenario: Migration completes
- **WHEN** `prisma migrate deploy` is run against a hub with an existing unpartitioned task table
- **THEN** the table is converted to partitioned format with existing data preserved

### Requirement: Partitioning is opt-in for small deployments
For new deployments under 1M tasks, partitioning SHALL be optional. The hub SHALL work with either a partitioned or unpartitioned task table.

#### Scenario: Unpartitioned table works
- **WHEN** the hub starts with a standard (unpartitioned) task table
- **THEN** all functionality works normally without partitioning
