## MODIFIED Requirements

### Requirement: Components are theme-aware
All components SHALL support light and dark themes by consuming Tailwind v4 tokens defined in the shared `@rezics/dispatch-ui/tailwind.css` entry. Dark mode SHALL be triggered by the presence of the `.dark` class on `document.documentElement` (shadcn convention), not by a `data-theme` attribute and not via a theme context prop.

#### Scenario: Dark mode
- **WHEN** the parent application sets the `dark` class on `<html>`
- **THEN** components render with dark backgrounds and light text, driven by CSS variables inside `.dark { ... }` in the shared Tailwind entry

#### Scenario: Light mode default
- **WHEN** `<html>` has no `dark` class
- **THEN** components render with the light-mode token values

### Requirement: TaskCard component
The `@rezics/dispatch-ui` package SHALL export a `TaskCard` component that displays a task's ID, type, status (with color indicator), priority, progress (if available), and timestamps. The component SHALL be implemented internally using shadcn primitives (e.g., `Card`, `Badge`, `Progress`) and Tailwind utilities; its public prop API SHALL remain unchanged.

#### Scenario: Render pending task
- **WHEN** `TaskCard` is rendered with a task of status `'pending'`
- **THEN** it displays the task type, a pending status badge, and the created timestamp

#### Scenario: Render running task with progress
- **WHEN** `TaskCard` is rendered with a running task that has progress `{ percent: 60, message: 'Parsing' }`
- **THEN** it displays a progress bar at 60% with the message "Parsing"

### Requirement: WorkerBadge component
The package SHALL export a `WorkerBadge` component that displays a worker's ID, mode (WS/HTTP), capabilities as tags, concurrency, and connection health (last seen time). The component SHALL be implemented internally using shadcn primitives (e.g., `Badge`, `Tooltip`) and Tailwind utilities; its public prop API SHALL remain unchanged.

#### Scenario: Healthy WS worker
- **WHEN** `WorkerBadge` is rendered with a WS-mode worker whose `lastSeen` is within 30s
- **THEN** it displays a green health indicator and capability tags

#### Scenario: Stale worker
- **WHEN** `WorkerBadge` is rendered with a worker whose `lastSeen` is over 60s ago
- **THEN** it displays a red/warning health indicator

### Requirement: LogPanel component
The package SHALL export a `LogPanel` component that renders a scrollable list of log entries with timestamps, severity levels (info, warn, error), and message text. The component SHALL be implemented internally using shadcn primitives (e.g., `ScrollArea`) and Tailwind utilities; its public prop API SHALL remain unchanged.

#### Scenario: Render log entries
- **WHEN** `LogPanel` is rendered with 50 log entries
- **THEN** it displays them in reverse chronological order with scroll

#### Scenario: Error entries highlighted
- **WHEN** a log entry has severity `'error'`
- **THEN** it is visually distinguished (e.g., red text or background)

## REMOVED Requirements

### Requirement: theme.css entry
**Reason:** `@rezics/dispatch-ui/src/theme.css` is replaced by the shared Tailwind v4 entry `@rezics/dispatch-ui/src/tailwind.css` which owns all theme tokens.
**Migration:** Consumers replace `import '@rezics/dispatch-ui/src/theme.css'` with `import '@rezics/dispatch-ui/tailwind.css'`. Custom properties previously defined in `theme.css` are now defined inside `@theme` and `.dark { ... }` blocks of the Tailwind entry.
