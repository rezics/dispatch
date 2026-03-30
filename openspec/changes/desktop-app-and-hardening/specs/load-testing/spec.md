## ADDED Requirements

### Requirement: k6 load test for queue throughput
The project SHALL include a k6 test script that seeds N tasks (configurable, target 10M) and simulates M concurrent workers (configurable, target 100) claiming, executing, and completing tasks via the HTTP Lease API.

#### Scenario: Run load test
- **WHEN** `k6 run load-test.js --env TASKS=10000000 --env WORKERS=100` is executed against a running hub
- **THEN** the test creates tasks, runs simulated workers, and reports throughput (tasks/sec) and latency (p50, p95, p99)

### Requirement: Seed script for bulk task creation
A seed script SHALL efficiently insert large numbers of tasks into the hub (via direct database insertion or batched API calls) for load testing purposes.

#### Scenario: Seed 10M tasks
- **WHEN** the seed script runs with `--count 10000000 --project test`
- **THEN** 10M tasks are inserted in under 10 minutes

### Requirement: k6 measures claim latency
The load test SHALL measure and report the p50, p95, and p99 latency of the `POST /tasks/claim` endpoint under concurrent load.

#### Scenario: Latency reported
- **WHEN** the load test completes
- **THEN** the output includes claim latency percentiles (e.g., p50=5ms, p95=20ms, p99=50ms)

### Requirement: k6 measures completion throughput
The load test SHALL measure and report the sustained throughput of the full claim→complete cycle in tasks per second.

#### Scenario: Throughput reported
- **WHEN** 100 workers run for 5 minutes
- **THEN** the output includes sustained throughput (e.g., "2,500 tasks/sec")

### Requirement: Load test Dockerfile
The project SHALL include a Dockerfile in `test/load/` that installs k6 and bundles the test scripts, allowing the load test to run without local k6 installation.

#### Scenario: Docker load test
- **WHEN** `docker build -t dispatch-loadtest test/load/ && docker run dispatch-loadtest` is executed
- **THEN** the load test runs inside the container

### Requirement: Load test validates no data loss
After the load test completes, the script SHALL verify that all seeded tasks reached a terminal status (`done` or `failed`) — no tasks stuck in `pending` or `running`.

#### Scenario: All tasks completed
- **WHEN** the load test finishes and the verification step runs
- **THEN** the count of `pending` + `running` tasks is 0
