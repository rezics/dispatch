## ADDED Requirements

### Requirement: Worker-level heartbeat in HTTP mode
The worker in HTTP mode SHALL send periodic `POST /workers/heartbeat` requests to the hub. Each heartbeat extends the leases of all tasks currently held by the worker in a single request.

#### Scenario: Heartbeat sent at interval
- **WHEN** the worker is running in HTTP mode with `heartbeatInterval: 60000`
- **THEN** the worker sends a heartbeat request approximately every 60 seconds

#### Scenario: Heartbeat includes worker identity
- **WHEN** the worker sends a heartbeat
- **THEN** the request body contains `{ workerId: "<worker-id>" }`

### Requirement: Configurable heartbeat interval
The worker SHALL accept a `heartbeatInterval` configuration value (milliseconds). Default value SHALL be 60000 (60 seconds).

#### Scenario: Default interval
- **WHEN** no `heartbeatInterval` is configured
- **THEN** the worker sends heartbeats every 60 seconds

#### Scenario: Custom interval
- **WHEN** `heartbeatInterval: 30000` is configured
- **THEN** the worker sends heartbeats every 30 seconds

### Requirement: Heartbeat replaces per-task lease renewal in HTTP mode
The worker in HTTP mode SHALL NOT call `POST /tasks/lease/renew` for individual tasks. The worker-level heartbeat is the sole mechanism for keeping task leases alive.

#### Scenario: No per-task renewal calls
- **WHEN** the worker is running in HTTP mode with 100 claimed tasks
- **THEN** the worker sends only `POST /workers/heartbeat` requests, not `POST /tasks/lease/renew`

### Requirement: Heartbeat failure handling
If a heartbeat request fails, the worker SHALL retry on the next interval. If heartbeats fail consecutively for longer than the expected grace period, the worker SHALL log a warning indicating that task leases may expire.

#### Scenario: Single heartbeat failure
- **WHEN** one heartbeat request fails with a network error
- **THEN** the worker logs a warning and retries at the next interval

#### Scenario: Sustained heartbeat failure
- **WHEN** heartbeat requests fail for 3 consecutive intervals
- **THEN** the worker logs an error warning that task leases are likely expired

### Requirement: Heartbeat not used in WebSocket mode
The worker in WebSocket mode SHALL NOT send HTTP heartbeat requests. The existing WebSocket heartbeat messages (every 15s) and connection state serve as the liveness signal.

#### Scenario: WS mode uses WS heartbeat
- **WHEN** the worker is running in WebSocket mode
- **THEN** no `POST /workers/heartbeat` requests are made
