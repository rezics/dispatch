## MODIFIED Requirements

### Requirement: TaskCard component
The `@rezics/dispatch-ui` package SHALL export a `TaskCard` component that displays a task's ID, type, status (with color indicator), priority, progress (if available), and timestamps. The component SHALL be implemented internally using `@rezics/ui/shadcn` primitives (e.g., `Card`, `Badge`, `Progress`) and UnoCSS utilities driven by the `@rezics/ui` design tokens; its public prop API SHALL remain unchanged. The status indicator SHALL map task states to rezics semantic tokens: `pending` → `border-whisper` with `text-text-secondary`; `running` → `info-fill`; `succeeded` → `success-fill`; `failed` → `error-fill`; `retrying` → `warning-fill`. The progress bar SHALL use `brand-fill` for the filled portion.

#### Scenario: Render pending task
- **WHEN** `TaskCard` is rendered with a task of status `'pending'`
- **THEN** it displays the task type, a pending status badge styled with `border-whisper` + `text-text-secondary`, and the created timestamp

#### Scenario: Render running task with progress
- **WHEN** `TaskCard` is rendered with a running task that has progress `{ percent: 60, message: 'Parsing' }`
- **THEN** it displays a progress bar at 60% filled with `brand-fill` and the message "Parsing"

#### Scenario: Render failed task
- **WHEN** `TaskCard` is rendered with a task of status `'failed'`
- **THEN** the status badge uses the `error-fill` semantic token

### Requirement: WorkerBadge component
The `@rezics/dispatch-ui` package SHALL export a `WorkerBadge` component that displays a worker's ID, mode (WS/HTTP), capabilities as tags, concurrency, and connection health. The component SHALL be implemented internally using `@rezics/ui/shadcn` primitives (e.g., `Badge`, `Tooltip`) and UnoCSS utilities driven by the `@rezics/ui` design tokens; its public prop API SHALL remain unchanged. Mode chips SHALL use `border-whisper`. Capability tags SHALL use `surface-subtle` background. Health indicator SHALL map to rezics semantic tokens: healthy (`lastSeen` within 30s) → `success-fill`; stale (`lastSeen` 30–60s) → `warning-fill`; down (`lastSeen` over 60s) → `error-fill`.

#### Scenario: Healthy WS worker
- **WHEN** `WorkerBadge` is rendered with a WS-mode worker whose `lastSeen` is within 30s
- **THEN** it displays a `success-fill` health indicator and capability tags on `surface-subtle`

#### Scenario: Stale worker
- **WHEN** `WorkerBadge` is rendered with a worker whose `lastSeen` is 30–60s ago
- **THEN** it displays a `warning-fill` health indicator

#### Scenario: Down worker
- **WHEN** `WorkerBadge` is rendered with a worker whose `lastSeen` is over 60s ago
- **THEN** it displays an `error-fill` health indicator

### Requirement: LogPanel component
The `@rezics/dispatch-ui` package SHALL export a `LogPanel` component that renders a scrollable list of log entries with timestamps, severity levels (info, warn, error), and message text. The component SHALL be implemented internally using `@rezics/ui/shadcn` primitives (e.g., `ScrollArea`) and UnoCSS utilities driven by the `@rezics/ui` design tokens; its public prop API SHALL remain unchanged. Default row text SHALL use `text-text-secondary`; timestamps SHALL use `text-text-tertiary`; error entries SHALL render with `text-error-text` and a left accent `border-l border-error-border`.

#### Scenario: Render log entries
- **WHEN** `LogPanel` is rendered with 50 log entries
- **THEN** it displays them in reverse chronological order with scroll, default rows in `text-text-secondary`, and timestamps in `text-text-tertiary`

#### Scenario: Error entries highlighted
- **WHEN** a log entry has severity `'error'`
- **THEN** it renders with `text-error-text` and a left accent `border-l border-error-border`

#### Scenario: Warning entries highlighted
- **WHEN** a log entry has severity `'warn'`
- **THEN** it renders with `text-warning-text`

### Requirement: QueueChart component
The `@rezics/dispatch-ui` package SHALL export a `QueueChart` component that renders a line chart showing queue depth over time (pending, running counts) and optionally a throughput chart (tasks completed per minute). The component SHALL be implemented using recharts internally with axis, grid, and series colors driven by the `@rezics/ui` design tokens via `var(--colors-*)` references. Axis and grid SHALL use `border-whisper`. Pending line SHALL use `brand-fill`. Running line SHALL use `warning-fill`. Completed (throughput) line SHALL use `success-fill`.

#### Scenario: Queue depth chart
- **WHEN** `QueueChart` is rendered with time-series data for pending and running counts
- **THEN** it displays two lines on a time-axis chart — pending in `var(--colors-brand-fill)`, running in `var(--colors-warning-fill)` — with axis/grid in `var(--colors-border-whisper)`

#### Scenario: Throughput chart with completed series
- **WHEN** `QueueChart` is rendered with throughput data (tasks completed per minute)
- **THEN** the completed line renders in `var(--colors-success-fill)`

#### Scenario: Empty data
- **WHEN** `QueueChart` is rendered with no data points
- **THEN** it displays an empty state message styled with `text-text-tertiary`

### Requirement: Components are theme-aware via the `@rezics/ui` preflight
All `@rezics/dispatch-ui` business components SHALL support light and dark themes by consuming `@rezics/ui` design tokens through UnoCSS theme classes or `var(--colors-*)`. Dark mode SHALL be triggered by `data-theme="dark"` on `document.documentElement` (canonical). The `.dark` class on `<html>` SHALL also be honored as a transitional alias matching the `@rezics/ui` preflight's `:is(.dark, [data-theme="dark"])` rule. Components SHALL NOT consult a theme context prop and SHALL NOT define their own dark-mode CSS variables.

#### Scenario: Dark mode via data-theme
- **WHEN** the parent application sets `data-theme="dark"` on `<html>`
- **THEN** components render with dark backgrounds and light text, driven by the `--colors-*` values emitted by `@rezics/ui`'s preflight under the `[data-theme="dark"]` selector

#### Scenario: Dark mode via class alias
- **WHEN** the parent application sets the `dark` class on `<html>` (transitional)
- **THEN** components render with the same dark-mode tokens, because `@rezics/ui`'s preflight applies them under `:is(.dark, [data-theme="dark"])`

#### Scenario: Light mode default
- **WHEN** `<html>` has neither `data-theme="dark"` nor the `dark` class
- **THEN** components render with the light-mode token values from the `@rezics/ui` preflight
