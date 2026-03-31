## ADDED Requirements

### Requirement: Result plugin interface
The hub SHALL define a `ResultPlugin` interface with: `id` (string), `handle(task, result, config)` async method. Each result plugin processes a `TaskResult` after a task is marked done.

#### Scenario: Plugin interface contract
- **WHEN** a result plugin is implemented with `id: 'webhook'` and a `handle` method
- **THEN** it satisfies the `ResultPlugin` interface

### Requirement: Result plugin runner dispatches by strategy
When a task completes with `status: 'done'`, the hub SHALL invoke the result plugin runner. The runner matches `TaskResult.strategy` to a registered plugin and calls its `handle` method.

#### Scenario: Store strategy routed to store plugin
- **WHEN** a task completes with `{ strategy: 'store', data: { title: 'Book A' } }`
- **THEN** the store plugin's `handle` method is invoked with the task and result

#### Scenario: Unknown strategy logged and skipped
- **WHEN** a task completes with `{ strategy: 'custom', plugin: 'unregistered' }` and no matching plugin exists
- **THEN** the hub logs a warning and the task is still marked `done` (result handling failure does not block completion)

### Requirement: Built-in store plugin
The hub SHALL include a `store` result plugin that writes `TaskResult.data` to the `task_result` table, keyed by `taskId`.

#### Scenario: Result stored
- **WHEN** a task completes with `{ strategy: 'store', data: { title: 'Book A' } }`
- **THEN** a row is inserted into `task_result` with `taskId` and the JSON data

#### Scenario: Duplicate store overwrites
- **WHEN** a task is retried and completes again with `strategy: 'store'`
- **THEN** the existing `task_result` row is upserted (replaced)

### Requirement: Built-in webhook plugin
The hub SHALL include a `webhook` result plugin that sends an HTTP POST to `TaskResult.url` with `TaskResult.data` as the JSON body and optional `TaskResult.headers`.

#### Scenario: Webhook fired
- **WHEN** a task completes with `{ strategy: 'webhook', url: 'https://api.example.com/hook', data: { id: 1 } }`
- **THEN** an HTTP POST is sent to `https://api.example.com/hook` with body `{ id: 1 }`

#### Scenario: Webhook with custom headers
- **WHEN** a task result includes `headers: { 'X-API-Key': 'secret' }`
- **THEN** the HTTP POST includes the `X-API-Key` header

#### Scenario: Webhook failure logged
- **WHEN** the webhook URL returns a non-2xx response
- **THEN** the hub logs a warning with the status code and response; the task remains `done`

### Requirement: Built-in discard plugin
The hub SHALL include a `discard` result plugin that does nothing. Tasks with `{ strategy: 'discard' }` are marked done with no side effects.

#### Scenario: Discard is a no-op
- **WHEN** a task completes with `{ strategy: 'discard' }`
- **THEN** no result is stored and no webhook is fired

### Requirement: Custom plugin registration at hub startup
The hub configuration SHALL accept an array of custom result plugins that are registered at startup. Custom plugins handle `{ strategy: 'custom', plugin: '<id>', data }` results.

#### Scenario: Custom plugin registered
- **WHEN** a custom plugin with `id: 'elasticsearch'` is registered in hub config
- **THEN** tasks completing with `{ strategy: 'custom', plugin: 'elasticsearch', data }` are routed to that plugin

### Requirement: Per-project plugin configuration
Result plugin behavior SHALL be configurable per project via the `result_plugin` table. A project can enable/disable specific plugins and provide plugin-specific config (e.g., default webhook URL).

#### Scenario: Plugin disabled for project
- **WHEN** the `webhook` plugin is disabled for project `'analytics'` and a task completes with `strategy: 'webhook'`
- **THEN** the webhook is NOT fired and a warning is logged
