## ADDED Requirements

### Requirement: Guided first-run setup screen
On first launch (no existing config), the app SHALL display a setup screen that collects: hub URL and authentication token. The setup screen is a WebView page within the app.

#### Scenario: First launch shows setup
- **WHEN** the app launches with no saved configuration
- **THEN** the setup screen is displayed instead of the dashboard

#### Scenario: Subsequent launches skip setup
- **WHEN** the app launches with a valid saved configuration
- **THEN** the setup screen is skipped and the dashboard loads directly

### Requirement: Hub URL validation
The setup screen SHALL validate the hub URL by attempting a health check request. Invalid or unreachable URLs show an error message.

#### Scenario: Valid hub URL
- **WHEN** the user enters `https://hub.example.com` and the health check succeeds
- **THEN** the URL field shows a success indicator

#### Scenario: Unreachable hub URL
- **WHEN** the user enters `https://bad-url.example.com` and the health check fails
- **THEN** the URL field shows an error "Unable to reach hub"

### Requirement: Token input and validation
The setup screen SHALL accept a JWT token (via paste or file import) and validate its format (three base64 segments). Optionally, it verifies the token against the hub.

#### Scenario: Valid token accepted
- **WHEN** the user pastes a correctly formatted JWT
- **THEN** the token field shows a success indicator

#### Scenario: Malformed token rejected
- **WHEN** the user pastes `not-a-jwt`
- **THEN** the token field shows an error "Invalid token format"

### Requirement: Config saved to local filesystem
On setup completion, the app SHALL save the configuration (hub URL, token) to a local file in the OS-appropriate app data directory (e.g., `~/Library/Application Support/dispatch/` on macOS).

#### Scenario: Config persisted
- **WHEN** the user completes setup and clicks "Save & Start"
- **THEN** the config is written to disk and the worker starts with those settings

### Requirement: Reconfiguration accessible from dashboard
The dashboard SHALL include a "Settings" option (accessible from tray menu or dashboard nav) that re-opens the setup screen to change hub URL or token.

#### Scenario: Change hub URL
- **WHEN** the user opens Settings and changes the hub URL
- **THEN** the worker restarts with the new URL after saving
