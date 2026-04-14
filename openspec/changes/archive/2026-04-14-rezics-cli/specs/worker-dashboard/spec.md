## MODIFIED Requirements

### Requirement: Local HTTP API for dashboard data
The worker-dashboard SPA SHALL fetch data from API endpoints prefixed with `/api/` at the current origin. The endpoints are `GET /api/status`, `GET /api/tasks`, and `GET /api/config`. The host process (CLI) is responsible for serving these endpoints and the dashboard static files.

#### Scenario: Local API responds
- **WHEN** `GET /api/status` is called via the dashboard's fetch client
- **THEN** it returns JSON with connection state, uptime, and task counts

#### Scenario: Port configurable
- **WHEN** the host process serves the dashboard on port 9999
- **THEN** the dashboard fetches from `http://localhost:9999/api/status` (via `window.location.origin`)
