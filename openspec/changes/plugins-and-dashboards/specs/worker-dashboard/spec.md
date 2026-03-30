## ADDED Requirements

### Requirement: Status page
The worker-dashboard SHALL display a status page showing: connected hub URL, connection mode (WS/HTTP), connection state (connected/disconnected/reconnecting), uptime, and aggregate counts (active tasks, completed, failed).

#### Scenario: Connected status
- **WHEN** the status page is opened and the worker is connected
- **THEN** it shows the hub URL, mode, a green "Connected" indicator, and task counts

#### Scenario: Disconnected status
- **WHEN** the worker loses connection to the hub
- **THEN** the status page shows a red "Disconnected" indicator and reconnect attempt info

### Requirement: Tasks page with live progress
The worker-dashboard SHALL display a tasks page showing currently active tasks with live progress bars, plus a scrollable history of completed and failed tasks with timestamps and error details.

#### Scenario: Active tasks with progress
- **WHEN** 3 tasks are running and one reports 60% progress
- **THEN** the tasks page shows 3 active task cards, one with a 60% progress bar

#### Scenario: Failed task details
- **WHEN** a task in the history has status `'failed'`
- **THEN** the task card shows the error message and whether it was retried

### Requirement: Config page (read-only)
The worker-dashboard SHALL display a config page showing: loaded plugins (name, version, capabilities), current worker concurrency, mode, and the validated config values (with secrets redacted).

#### Scenario: Plugin list
- **WHEN** the config page is opened and 2 plugins are loaded
- **THEN** it shows both plugins with their names, versions, and capability tags

#### Scenario: Secrets redacted
- **WHEN** the config includes `proxy: 'http://user:pass@proxy.example.com'`
- **THEN** the displayed value is redacted (e.g., `http://***@proxy.example.com`)

### Requirement: Local HTTP API for dashboard data
The worker SHALL expose a local HTTP API (default `localhost:45321`) that serves worker status, active tasks, task history, and config. The worker-dashboard fetches data from this local API.

#### Scenario: Local API responds
- **WHEN** `GET http://localhost:45321/status` is called
- **THEN** it returns JSON with connection state, uptime, and task counts

#### Scenario: Port configurable
- **WHEN** the worker is configured with `dashboard.port: 9999`
- **THEN** the local API listens on port 9999

### Requirement: Navigation
The worker-dashboard SHALL have navigation with links to: Status, Tasks, Config.

#### Scenario: Navigate between pages
- **WHEN** the user clicks "Config" in the navigation
- **THEN** the config page renders without a full page reload

### Requirement: Dark mode support
The worker-dashboard SHALL support dark mode matching the hub-dashboard's implementation (toggle, localStorage persistence, system preference default).

#### Scenario: Dark mode persisted
- **WHEN** the user enables dark mode and refreshes the page
- **THEN** dark mode remains active
