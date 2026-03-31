## ADDED Requirements

### Requirement: Hub serves dashboard at /_dashboard
The hub SHALL serve the hub-dashboard's static build output (HTML, JS, CSS) at the `/_dashboard` path prefix using `@elysiajs/static`.

#### Scenario: Dashboard accessible
- **WHEN** a browser navigates to `https://hub.example.com/_dashboard`
- **THEN** the hub-dashboard SPA loads and renders

#### Scenario: SPA fallback routing
- **WHEN** a browser navigates to `https://hub.example.com/_dashboard/tasks`
- **THEN** the hub serves `index.html` and the SPA router handles the `/tasks` sub-route

### Requirement: Dashboard disableable via environment variable
The hub SHALL NOT serve the dashboard when `DISPATCH_DISABLE_DASHBOARD=true` is set. Requests to `/_dashboard` SHALL return HTTP 404.

#### Scenario: Dashboard disabled
- **WHEN** `DISPATCH_DISABLE_DASHBOARD=true` and a request is made to `/_dashboard`
- **THEN** the hub returns HTTP 404

#### Scenario: Dashboard enabled by default
- **WHEN** `DISPATCH_DISABLE_DASHBOARD` is not set
- **THEN** the dashboard is served at `/_dashboard`

### Requirement: Dashboard build output included in hub package
The hub-dashboard build output SHALL be included in the `@rezics/dispatch-hub` npm package at build time, so no separate installation or build step is needed by hub operators.

#### Scenario: Fresh hub install serves dashboard
- **WHEN** a user installs `@rezics/dispatch-hub` and starts the hub
- **THEN** the dashboard is immediately available at `/_dashboard` without additional setup

### Requirement: Dashboard does not interfere with API routes
The `/_dashboard` static serving SHALL NOT conflict with API routes (`/tasks`, `/workers`, `/projects`, `/openapi`). API routes take precedence.

#### Scenario: API route not shadowed
- **WHEN** a request is made to `/tasks`
- **THEN** the API handler responds, not the static file server
