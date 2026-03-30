## ADDED Requirements

### Requirement: README with project overview
The project root SHALL include a `README.md` with: project description, architecture diagram (text-based), feature list, quick start instructions, package table, and links to detailed docs.

#### Scenario: README exists and is complete
- **WHEN** a user visits the GitHub repository
- **THEN** the README displays a clear project overview with architecture diagram and quick start

### Requirement: Getting started guide
The README (or a linked doc) SHALL include step-by-step instructions for: (1) running the hub locally with Docker Compose, (2) creating a project and tasks, (3) running a worker with an official plugin, (4) viewing the dashboard.

#### Scenario: New user follows guide
- **WHEN** a developer follows the getting started guide from scratch
- **THEN** they have a running hub, a connected worker, and can view tasks in the dashboard within 10 minutes

### Requirement: Docker Compose for hub deployment
The project SHALL include a `docker-compose.yml` that starts the hub server and PostgreSQL with a single command (`docker compose up`). PostgreSQL data is persisted via a named volume.

#### Scenario: One-command start
- **WHEN** `docker compose up -d` is run
- **THEN** PostgreSQL starts, migrations run, and the hub is accessible at `http://localhost:3721`

#### Scenario: Data persists across restarts
- **WHEN** `docker compose down && docker compose up -d` is run
- **THEN** all tasks, projects, and workers are preserved

### Requirement: Hub Dockerfile
The project SHALL include a `Dockerfile` for the hub that builds the hub binary, includes the embedded dashboard, and runs Prisma migrations on startup.

#### Scenario: Docker image builds
- **WHEN** `docker build -t dispatch-hub .` is run from the project root
- **THEN** a Docker image is produced that runs the hub on port 3721

### Requirement: Environment variable documentation
The README or a linked doc SHALL list all supported environment variables with descriptions, types, defaults, and examples.

#### Scenario: Env vars documented
- **WHEN** a user looks up `TASK_RETENTION_DAYS`
- **THEN** the docs show its type (number), default (30), and description

### Requirement: API quick reference
The README or a linked doc SHALL include a quick reference table of all hub API endpoints with method, path, auth requirement, and brief description.

#### Scenario: API reference available
- **WHEN** a developer needs the claim endpoint
- **THEN** the docs show `POST /tasks/claim — Authenticated — Claim a batch of tasks for processing`

### Requirement: Architecture diagram
The docs SHALL include a text-based architecture diagram showing: IdP → Hub → PostgreSQL, Hub ↔ Workers (WS + HTTP), Hub → Dashboard, Worker → Tauri Desktop App.

#### Scenario: Diagram in README
- **WHEN** the README is rendered on GitHub
- **THEN** the architecture diagram is visible as a code block with ASCII art
