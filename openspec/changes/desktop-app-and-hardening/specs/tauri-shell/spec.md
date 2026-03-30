## ADDED Requirements

### Requirement: Tauri app launches worker sidecar
The Tauri app SHALL spawn the compiled dispatch-worker binary as a sidecar process on app launch. The sidecar exposes its local HTTP API on `localhost:45321`.

#### Scenario: App starts worker
- **WHEN** the desktop app is launched
- **THEN** the worker sidecar binary is spawned and its local API becomes available at `localhost:45321`

#### Scenario: App stops worker on exit
- **WHEN** the desktop app is closed
- **THEN** the sidecar process is terminated gracefully (SIGTERM)

### Requirement: System tray icon with status
The Tauri app SHALL display a system tray icon that indicates the worker's current status: connected (green), disconnected (red), processing (animated/pulsing). Clicking the tray icon opens the dashboard window.

#### Scenario: Tray shows connected
- **WHEN** the worker is connected to the hub
- **THEN** the tray icon displays a green status indicator

#### Scenario: Tray click opens dashboard
- **WHEN** the user clicks the tray icon
- **THEN** the dashboard window opens or focuses if already open

### Requirement: Tray shows active task count
The tray icon tooltip SHALL display the number of currently active tasks (e.g., "Dispatch — 5 tasks running").

#### Scenario: Task count in tooltip
- **WHEN** the worker has 5 active tasks
- **THEN** the tray tooltip shows "Dispatch — 5 tasks running"

### Requirement: WebView renders worker-dashboard
The app's main window SHALL render the worker-dashboard (built as static files) in a WebView, connected to the sidecar's local HTTP API.

#### Scenario: Dashboard renders in app
- **WHEN** the main window opens
- **THEN** the worker-dashboard SPA loads and displays live worker status

### Requirement: Auto-updater via Tauri updater plugin
The app SHALL check for updates on launch and periodically (every 6 hours) using Tauri's built-in updater plugin pointing to GitHub Releases. If an update is available, the user is prompted to install.

#### Scenario: Update available
- **WHEN** a newer version exists on GitHub Releases
- **THEN** the app shows an update prompt with release notes and an "Install" button

#### Scenario: No update
- **WHEN** the app is already on the latest version
- **THEN** no prompt is shown

### Requirement: App runs on Windows, macOS, and Linux
The Tauri app SHALL produce platform-specific binaries: `.exe` (Windows), `.dmg` (macOS), `.deb` (Linux).

#### Scenario: macOS build
- **WHEN** the Tauri build runs on macOS
- **THEN** a `.dmg` file is produced that installs the app to Applications
