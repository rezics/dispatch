### Requirement: CLI entry point with subcommands
The CLI SHALL parse the first positional argument as a subcommand. Supported subcommands are `start`, `status`, `tasks`, and `config`. If no subcommand is given or an unknown subcommand is provided, the CLI SHALL print usage help and exit with code 1.

#### Scenario: No subcommand
- **WHEN** the CLI is invoked with no arguments
- **THEN** it prints usage help listing all subcommands and exits with code 1

#### Scenario: Unknown subcommand
- **WHEN** the CLI is invoked with `rezics foo`
- **THEN** it prints `Unknown command: foo` followed by usage help and exits with code 1

#### Scenario: Valid subcommand
- **WHEN** the CLI is invoked with `rezics start`
- **THEN** the `start` subcommand handler is executed

### Requirement: `start` subcommand launches worker and dashboard server
The `start` subcommand SHALL load config, create a worker with all crawlers registered, start the dashboard HTTP server, start the worker, and print a startup banner showing the dashboard URL. It SHALL remain running until interrupted.

#### Scenario: Successful start
- **WHEN** `rezics start` is invoked with valid config
- **THEN** the worker connects to the hub, the dashboard server starts listening, and the CLI prints `Rezics worker running on http://localhost:<port>`

#### Scenario: Start with custom port
- **WHEN** `rezics start --port 9999` is invoked
- **THEN** the dashboard server listens on port 9999

#### Scenario: Start with custom mode
- **WHEN** `rezics start --mode ws` is invoked
- **THEN** the worker uses WebSocket mode

#### Scenario: Start with custom concurrency
- **WHEN** `rezics start --concurrency 20` is invoked
- **THEN** the worker runs with concurrency 20

### Requirement: Signal handling for graceful shutdown
The `start` subcommand SHALL register handlers for SIGINT and SIGTERM that trigger graceful shutdown: stop the worker (waiting for in-flight tasks up to shutdown timeout), stop the dashboard server, then exit with code 0.

#### Scenario: SIGINT received
- **WHEN** SIGINT is sent to the CLI process during `start`
- **THEN** the worker stops gracefully, the dashboard server closes, and the process exits with code 0

#### Scenario: SIGTERM received
- **WHEN** SIGTERM is sent to the CLI process during `start`
- **THEN** the same graceful shutdown occurs as with SIGINT

### Requirement: `status` subcommand queries running instance
The `status` subcommand SHALL make an HTTP GET to `http://localhost:<port>/api/status` and print the worker status in a human-readable format. If the server is not reachable, it SHALL print an error and exit with code 1.

#### Scenario: Running instance
- **WHEN** `rezics status` is invoked and a Rezics worker is running on the default port
- **THEN** it prints the worker mode, connection state, uptime, and task counts

#### Scenario: No running instance
- **WHEN** `rezics status` is invoked and no worker is running on the default port
- **THEN** it prints `Could not connect to Rezics worker on port <port>` and exits with code 1

#### Scenario: Custom port
- **WHEN** `rezics status --port 9999` is invoked
- **THEN** it queries `http://localhost:9999/api/status`

### Requirement: `tasks` subcommand queries active tasks
The `tasks` subcommand SHALL make an HTTP GET to `http://localhost:<port>/api/tasks` and print the active task list in a human-readable format.

#### Scenario: Tasks running
- **WHEN** `rezics tasks` is invoked and the worker has 3 active tasks
- **THEN** it prints a table or list showing each task's ID, type, duration, and progress

#### Scenario: No tasks
- **WHEN** `rezics tasks` is invoked and the worker has no active tasks
- **THEN** it prints `No active tasks`

### Requirement: `config` subcommand shows loaded configuration
The `config` subcommand SHALL load and validate the config file (without starting a worker) and print the resolved configuration with secrets redacted.

#### Scenario: Valid config
- **WHEN** `rezics config` is invoked and `~/.rezics/config.toml` exists with valid content
- **THEN** it prints the resolved config with token values replaced by `***`

#### Scenario: No config file
- **WHEN** `rezics config` is invoked and no config file is found
- **THEN** it prints `No config file found` and shows where it looked

#### Scenario: Invalid config
- **WHEN** `rezics config` is invoked and the config file has invalid values
- **THEN** it prints the validation errors and exits with code 1

### Requirement: Worker assembly with hardwired crawlers
The `start` subcommand SHALL create a worker using `createWorker()` from the worker SDK with both the book-crawler and anime-crawler plugins registered. The crawler plugin configs SHALL be sourced from the resolved CLI config.

#### Scenario: Both crawlers registered
- **WHEN** `rezics start` is invoked with default config
- **THEN** the worker registers both `book-crawler` and `anime-crawler` plugins and advertises capabilities `['book:crawl', 'book:update', 'anime:crawl', 'anime:update']`
