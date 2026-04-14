### Requirement: Elysia HTTP server for API and dashboard
The CLI SHALL start an Elysia HTTP server on a configurable port (default 45321) that serves both JSON API endpoints and the worker-dashboard SPA.

#### Scenario: Server starts on default port
- **WHEN** `rezics start` is invoked without `--port`
- **THEN** the HTTP server listens on port 45321

#### Scenario: Server starts on custom port
- **WHEN** `rezics start --port 9999` is invoked
- **THEN** the HTTP server listens on port 9999

#### Scenario: Port already in use
- **WHEN** the configured port is already occupied by another process
- **THEN** the CLI prints `Port <port> is already in use` and exits with code 1

### Requirement: API endpoint GET /api/status
The server SHALL respond to `GET /api/status` with a JSON object containing: `mode` (string), `connected` (boolean), `uptime` (number, milliseconds), `hubUrl` (string), `counts` (object with `active`, `completed`, `failed` numbers).

#### Scenario: Worker connected
- **WHEN** `GET /api/status` is called and the worker is running
- **THEN** the response is `200 OK` with `{ "mode": "http", "connected": true, "uptime": 12345, "hubUrl": "https://...", "counts": { "active": 2, "completed": 50, "failed": 1 } }`

### Requirement: API endpoint GET /api/tasks
The server SHALL respond to `GET /api/tasks` with a JSON object containing: `active` (array of active task info with id, type, startedAt, progress) and `counts` (aggregate counts).

#### Scenario: Active tasks exist
- **WHEN** `GET /api/tasks` is called and 2 tasks are running
- **THEN** the response includes an `active` array with 2 entries, each with `taskId`, `type`, `startedAt`, and `progress`

#### Scenario: No active tasks
- **WHEN** `GET /api/tasks` is called and no tasks are running
- **THEN** the response includes an empty `active` array

### Requirement: API endpoint GET /api/config
The server SHALL respond to `GET /api/config` with a JSON object containing the resolved worker configuration with secrets redacted. Token values, API keys, and proxy credentials SHALL be replaced with `"***"`.

#### Scenario: Config with secrets
- **WHEN** `GET /api/config` is called and the config contains `hub.token = "rz_abc123"`
- **THEN** the response includes `"token": "***"` for the hub token field

#### Scenario: Crawler config included
- **WHEN** `GET /api/config` is called
- **THEN** the response includes crawler sections with their source lists and rate limit values (non-secret values shown in full)

### Requirement: Static file serving for dashboard SPA
The server SHALL serve static files from the worker-dashboard's build output directory for all paths not matched by `/api/*` routes. Requests to unmatched paths SHALL return `index.html` to support SPA client-side routing.

#### Scenario: Dashboard root
- **WHEN** `GET /` is requested
- **THEN** the server returns the dashboard's `index.html`

#### Scenario: Dashboard JS asset
- **WHEN** `GET /assets/index-abc123.js` is requested
- **THEN** the server returns the JavaScript file with correct MIME type

#### Scenario: SPA fallback
- **WHEN** `GET /tasks` is requested (a client-side route)
- **THEN** the server returns `index.html` (not 404), allowing React Router to handle the route

#### Scenario: Dashboard not built
- **WHEN** the dashboard build output directory does not exist
- **THEN** the API endpoints still work, but non-API requests return a JSON error `{ "error": "Dashboard not built. API endpoints are available at /api/*." }` with status 503

### Requirement: Server shutdown
The server SHALL close cleanly when the CLI shuts down, stopping all active connections and releasing the port.

#### Scenario: Graceful shutdown
- **WHEN** SIGINT is received
- **THEN** the Elysia server stops accepting new connections, existing requests complete, and the port is released
