## ADDED Requirements

### Requirement: Overview page
The hub-dashboard SHALL display an overview page showing: total task counts by status (pending, running, done, failed), a queue depth chart over time, a throughput chart (tasks completed per minute), and current connected worker count.

#### Scenario: Overview loads
- **WHEN** the overview page is opened
- **THEN** it displays live counts for each task status, a queue depth line chart, and worker count

#### Scenario: Data refreshes automatically
- **WHEN** the overview page is open for 10 seconds
- **THEN** the counts and charts update with fresh data from the hub API

### Requirement: Workers page
The hub-dashboard SHALL display a workers page showing a table of all connected workers with columns: ID, project, capabilities (as tags), concurrency, mode (WS/HTTP), last seen, and health indicator.

#### Scenario: Workers listed
- **WHEN** the workers page is opened and 5 workers are connected
- **THEN** a table displays 5 rows with worker details

#### Scenario: Worker goes offline
- **WHEN** a worker disconnects and the page refreshes
- **THEN** the worker is no longer shown (or shown with offline status)

### Requirement: Tasks page
The hub-dashboard SHALL display a tasks page with a filterable, paginated task list. Filters: status (multi-select), project (dropdown), type (text search), time range (date picker). Each row shows: ID, type, status, priority, worker, created, started, finished.

#### Scenario: Filter by status
- **WHEN** the user selects "pending" and "running" status filters
- **THEN** only pending and running tasks are shown

#### Scenario: Pagination
- **WHEN** there are 200 tasks and the page size is 50
- **THEN** pagination controls allow navigating through 4 pages

#### Scenario: Task detail
- **WHEN** the user clicks a task row
- **THEN** a detail view shows full payload, error details, progress, and timestamps

### Requirement: Plugins page
The hub-dashboard SHALL display a plugins page showing per-project result plugin configuration. Users can view and edit plugin enable/disable status and plugin-specific config (e.g., default webhook URL).

#### Scenario: View plugin config
- **WHEN** the plugins page is opened
- **THEN** each project's result plugins are listed with their enabled/disabled status

#### Scenario: Toggle plugin
- **WHEN** the user toggles the webhook plugin off for a project
- **THEN** a `PATCH` request is sent to update the result_plugin table

### Requirement: Navigation
The hub-dashboard SHALL have a sidebar or top navigation with links to: Overview, Workers, Tasks, Plugins.

#### Scenario: Navigate between pages
- **WHEN** the user clicks "Tasks" in the navigation
- **THEN** the tasks page is rendered without a full page reload (SPA routing)

### Requirement: Data fetching via Eden Treaty
The hub-dashboard SHALL use Eden Treaty to call the hub's REST API, ensuring end-to-end type safety between server routes and dashboard fetch calls.

#### Scenario: Type-safe API call
- **WHEN** the dashboard fetches `/tasks?status=pending`
- **THEN** the response is typed as `Task[]` without manual type assertions

### Requirement: Dark mode support
The hub-dashboard SHALL support dark mode via a toggle, persisted to localStorage. Default follows system preference.

#### Scenario: Toggle dark mode
- **WHEN** the user clicks the dark mode toggle
- **THEN** the entire dashboard switches to dark theme and the preference is saved
