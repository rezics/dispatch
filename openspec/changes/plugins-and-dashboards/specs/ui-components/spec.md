## ADDED Requirements

### Requirement: TaskCard component
The `@rezics/dispatch-ui` package SHALL export a `TaskCard` component that displays a task's ID, type, status (with color indicator), priority, progress (if available), and timestamps.

#### Scenario: Render pending task
- **WHEN** `TaskCard` is rendered with a task of status `'pending'`
- **THEN** it displays the task type, a pending status badge, and the created timestamp

#### Scenario: Render running task with progress
- **WHEN** `TaskCard` is rendered with a running task that has progress `{ percent: 60, message: 'Parsing' }`
- **THEN** it displays a progress bar at 60% with the message "Parsing"

### Requirement: WorkerBadge component
The package SHALL export a `WorkerBadge` component that displays a worker's ID, mode (WS/HTTP), capabilities as tags, concurrency, and connection health (last seen time).

#### Scenario: Healthy WS worker
- **WHEN** `WorkerBadge` is rendered with a WS-mode worker whose `lastSeen` is within 30s
- **THEN** it displays a green health indicator and capability tags

#### Scenario: Stale worker
- **WHEN** `WorkerBadge` is rendered with a worker whose `lastSeen` is over 60s ago
- **THEN** it displays a red/warning health indicator

### Requirement: LogPanel component
The package SHALL export a `LogPanel` component that renders a scrollable list of log entries with timestamps, severity levels (info, warn, error), and message text.

#### Scenario: Render log entries
- **WHEN** `LogPanel` is rendered with 50 log entries
- **THEN** it displays them in reverse chronological order with scroll

#### Scenario: Error entries highlighted
- **WHEN** a log entry has severity `'error'`
- **THEN** it is visually distinguished (e.g., red text or background)

### Requirement: QueueChart component
The package SHALL export a `QueueChart` component that renders a line chart showing queue depth over time (pending, running counts) and optionally a throughput chart (tasks completed per minute).

#### Scenario: Queue depth chart
- **WHEN** `QueueChart` is rendered with time-series data for pending and running counts
- **THEN** it displays two lines on a time-axis chart

#### Scenario: Empty data
- **WHEN** `QueueChart` is rendered with no data points
- **THEN** it displays an empty state message

### Requirement: Components accept i18n strings
All UI components SHALL accept translated strings via props (not hardcoded English), allowing consumers to pass values from the i18n layer.

#### Scenario: Localized status label
- **WHEN** `TaskCard` is rendered with `statusLabel: LL.common.status.running()`
- **THEN** the status badge displays the localized text

### Requirement: Components are theme-aware
All components SHALL support light and dark themes via CSS custom properties or a theme context prop.

#### Scenario: Dark mode
- **WHEN** the parent application sets dark theme
- **THEN** components render with dark backgrounds and light text
