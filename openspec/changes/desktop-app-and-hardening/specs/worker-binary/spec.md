## ADDED Requirements

### Requirement: Worker compiles to standalone binary
The dispatch-worker SHALL compile to a standalone binary via `bun build --compile --minify` that runs without Bun or Node installed on the target machine.

#### Scenario: Binary runs standalone
- **WHEN** the compiled binary is executed on a machine without Bun installed
- **THEN** the worker starts and connects to the configured hub

### Requirement: Binary includes all dependencies
The compiled binary SHALL bundle all npm dependencies, plugin code, and TypeScript runtime so no external `node_modules` is needed.

#### Scenario: No missing modules
- **WHEN** the binary starts with book-crawler and anime-crawler plugins configured
- **THEN** all plugin code executes without module resolution errors

### Requirement: Binary exposes local HTTP API
The compiled binary SHALL expose the worker's local HTTP API (for the worker-dashboard) on the configured port (default `localhost:45321`).

#### Scenario: Local API accessible
- **WHEN** the binary is running
- **THEN** `GET http://localhost:45321/status` returns worker status JSON

### Requirement: Binary accepts config file path
The binary SHALL accept a `--config` CLI argument pointing to a `worker.config.ts` or a JSON config file for the hub URL, token, and plugin settings.

#### Scenario: Config from file
- **WHEN** the binary is run with `--config ./my-config.json`
- **THEN** it loads the configuration from that file

#### Scenario: Default config location
- **WHEN** the binary is run without `--config`
- **THEN** it looks for `worker.config.ts` in the current directory
