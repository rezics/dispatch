## ADDED Requirements

### Requirement: Single-run mode claims once and exits
The worker in single-run mode SHALL claim a single batch of tasks via `POST /tasks/claim`, process them concurrently (up to `concurrency`), and resolve the `start()` promise when either all claimed tasks are processed or the configured `timeout` is reached.

#### Scenario: All tasks complete before timeout
- **WHEN** single-run mode claims 50 tasks and all 50 complete within the timeout
- **THEN** the `start()` promise resolves with a summary of completed/failed counts

#### Scenario: Timeout reached with tasks still running
- **WHEN** single-run mode claims 100 tasks and only 60 complete before `timeout` elapses
- **THEN** the worker stops processing, submits results for the 60 completed tasks, and resolves the `start()` promise with a summary indicating 40 tasks were not completed

#### Scenario: No tasks available
- **WHEN** single-run mode claims tasks and the hub returns an empty batch
- **THEN** the `start()` promise resolves immediately with zero tasks processed

### Requirement: Single-run mode maintains heartbeat during processing
The worker in single-run mode SHALL send periodic heartbeats to the hub throughout the processing window. The heartbeat keeps leases alive for all claimed tasks until processing completes or the timeout is reached.

#### Scenario: Heartbeat sent during long processing
- **WHEN** single-run mode is processing 100 tasks with a 120s timeout and 60s heartbeat interval
- **THEN** the worker sends a heartbeat at approximately 60s, keeping all task leases alive

#### Scenario: Heartbeat stops on completion
- **WHEN** all claimed tasks complete at 45s into a 120s timeout
- **THEN** the heartbeat timer is stopped and the worker exits cleanly

### Requirement: Single-run timeout configuration
The worker in single-run mode SHALL require a `timeout` configuration value (milliseconds) that bounds the maximum duration of a single run. The timeout MUST be a positive integer.

#### Scenario: Timeout configured
- **WHEN** `defineWorkerConfig({ mode: 'single-run', timeout: 120000, ... })` is called
- **THEN** the worker will run for at most 120 seconds before stopping

#### Scenario: Missing timeout rejected
- **WHEN** `defineWorkerConfig({ mode: 'single-run', ... })` is called without a `timeout` value
- **THEN** a validation error is thrown indicating timeout is required for single-run mode

### Requirement: Single-run claimCount configuration
The worker in single-run mode SHALL accept an optional `claimCount` value that determines how many tasks to claim per run. If omitted, it SHALL default to the `concurrency` value.

#### Scenario: Custom claim count
- **WHEN** `defineWorkerConfig({ mode: 'single-run', claimCount: 500, concurrency: 50, ... })` is called
- **THEN** the worker claims 500 tasks but processes at most 50 concurrently

#### Scenario: Default claim count
- **WHEN** `defineWorkerConfig({ mode: 'single-run', concurrency: 20, ... })` is called without `claimCount`
- **THEN** the worker claims 20 tasks (matching concurrency)

### Requirement: Single-run graceful wind-down on timeout
When the timeout is reached, the worker SHALL stop starting new task executions but SHALL NOT abort tasks that are already in-flight. In-flight tasks are given a configurable `shutdownTimeout` (default 30s) to complete before being abandoned.

#### Scenario: In-flight tasks finish within shutdown window
- **WHEN** timeout is reached and 3 tasks are in-flight, all completing within `shutdownTimeout`
- **THEN** all 3 task results are submitted before the run resolves

#### Scenario: In-flight tasks exceed shutdown window
- **WHEN** timeout is reached and 2 tasks are still running after `shutdownTimeout`
- **THEN** the worker abandons those 2 tasks (leases will expire on the hub) and resolves
