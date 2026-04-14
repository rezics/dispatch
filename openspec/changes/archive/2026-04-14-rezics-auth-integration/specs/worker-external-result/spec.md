## ADDED Requirements

### Requirement: External result endpoint configuration
The worker config SHALL accept an optional `hub.resultEndpoint` URL string. When set, the worker SDK SHALL submit task results to this endpoint instead of the hub's `POST /tasks/complete`.

#### Scenario: resultEndpoint configured
- **WHEN** `defineWorkerConfig` is called with `hub.resultEndpoint = "https://rezics.com/dispatch/results"`
- **THEN** the config is accepted and the worker uses the external endpoint for result submission

#### Scenario: resultEndpoint not configured
- **WHEN** `defineWorkerConfig` is called without `hub.resultEndpoint`
- **THEN** the worker submits results to the hub's `POST /tasks/complete` as before

### Requirement: External result submission
When `hub.resultEndpoint` is configured, the worker SDK SHALL POST task results to the external endpoint after a handler completes. The request SHALL include the worker's JWT as `Authorization: Bearer` and a JSON body with `{ taskId, project, type, data }` where `data` is the result returned by the plugin handler.

#### Scenario: Successful external submission
- **WHEN** a plugin handler returns a result and `resultEndpoint` is configured
- **THEN** the SDK POSTs the result to the external endpoint with the worker's Bearer token
- **AND** the SDK does NOT call the hub's `POST /tasks/complete`

#### Scenario: External endpoint returns error
- **WHEN** the external endpoint returns a non-2xx response
- **THEN** the SDK retries with exponential backoff (up to 3 attempts)
- **AND** if all retries fail, the task is treated as failed locally (logged, counted in failed stats)

#### Scenario: External endpoint unreachable
- **WHEN** the external endpoint connection fails
- **THEN** the SDK retries with exponential backoff (up to 3 attempts)

### Requirement: Batch external result submission
When using HTTP polling mode with `resultEndpoint`, the worker SDK SHALL batch completed results and submit them in a single POST, consistent with the existing batched submission to the hub.

#### Scenario: Multiple tasks complete before flush
- **WHEN** three tasks complete within the flush interval and `resultEndpoint` is configured
- **THEN** the SDK sends one POST with all three results to the external endpoint

### Requirement: No hub completion for external results
When `hub.resultEndpoint` is configured, the worker SDK SHALL NOT call the hub's `POST /tasks/complete` for any task. The external endpoint is solely responsible for notifying the hub (e.g., via `POST /tasks/audit`).

#### Scenario: Hub not called on completion
- **WHEN** `resultEndpoint` is set and a task completes
- **THEN** no HTTP request is made to the hub's `/tasks/complete` endpoint
