## ADDED Requirements

### Requirement: TOML config file loading
The CLI SHALL load configuration from a TOML file. The file path is resolved in order: `--config` flag, `REZICS_CONFIG` env var, `~/.rezics/config.toml`, `./rezics.toml`. The first existing file wins. If no file is found, config values SHALL come entirely from env vars and CLI flags.

#### Scenario: Default config path
- **WHEN** no `--config` flag or `REZICS_CONFIG` env var is set and `~/.rezics/config.toml` exists
- **THEN** the CLI loads config from `~/.rezics/config.toml`

#### Scenario: Project-local config
- **WHEN** `~/.rezics/config.toml` does not exist but `./rezics.toml` exists in the current directory
- **THEN** the CLI loads config from `./rezics.toml`

#### Scenario: Explicit config path
- **WHEN** `rezics start --config /path/to/my.toml` is invoked
- **THEN** the CLI loads config from `/path/to/my.toml`, ignoring default paths

#### Scenario: No config file
- **WHEN** no config file exists at any search path
- **THEN** the CLI proceeds with env vars and CLI flags only

#### Scenario: Invalid TOML syntax
- **WHEN** the config file contains invalid TOML
- **THEN** the CLI prints a parse error with line number and exits with code 1

### Requirement: Config schema with hub, worker, dashboard, and crawler sections
The config file SHALL support sections: `[hub]` (url, token), `[worker]` (mode, concurrency, poll_interval, heartbeat_interval, shutdown_timeout), `[dashboard]` (port), `[crawler.book]` (rate_limit, sources, proxy), `[crawler.anime]` (sources, mal_api_key, anilist_token).

#### Scenario: Full config
- **WHEN** the config file contains all sections with valid values
- **THEN** the CLI loads all values and uses them to configure the worker

#### Scenario: Partial config
- **WHEN** the config file only contains `[hub]` with url and token
- **THEN** all other values use their defaults (mode: http, concurrency: 10, port: 45321, etc.)

#### Scenario: Unknown section ignored
- **WHEN** the config file contains `[experimental]` section
- **THEN** the CLI ignores the unknown section without error

### Requirement: Environment variable overlay
Environment variables SHALL override config file values. Variables use the `REZICS_` prefix: `REZICS_HUB_URL`, `REZICS_HUB_TOKEN`, `REZICS_WORKER_MODE`, `REZICS_WORKER_CONCURRENCY`, `REZICS_DASHBOARD_PORT`. Legacy `DISPATCH_HUB_URL`, `DISPATCH_TOKEN`, `DISPATCH_MODE`, `DISPATCH_CONCURRENCY` SHALL also be recognized as aliases.

#### Scenario: Env var overrides file
- **WHEN** the config file sets `hub.url = "https://a.example.com"` and `REZICS_HUB_URL=https://b.example.com` is set
- **THEN** the resolved hub URL is `https://b.example.com`

#### Scenario: Legacy env var alias
- **WHEN** `DISPATCH_HUB_URL=https://legacy.example.com` is set and no `REZICS_HUB_URL` exists
- **THEN** the resolved hub URL is `https://legacy.example.com`

#### Scenario: REZICS_ takes precedence over DISPATCH_
- **WHEN** both `REZICS_HUB_URL=https://new.example.com` and `DISPATCH_HUB_URL=https://old.example.com` are set
- **THEN** the resolved hub URL is `https://new.example.com`

### Requirement: CLI flag override
CLI flags SHALL override both config file values and environment variables. Supported flags: `--port`, `--mode`, `--concurrency`, `--config`.

#### Scenario: Flag overrides env and file
- **WHEN** the config file sets `worker.concurrency = 10`, `REZICS_WORKER_CONCURRENCY=20` is set, and `--concurrency 30` is passed
- **THEN** the resolved concurrency is 30

### Requirement: Config validation
The resolved config SHALL be validated using Zod. The `hub.url` field is required (must be a valid URL). The `hub.token` field is required (non-empty string). All other fields have defaults. Invalid config SHALL cause the CLI to print validation errors and exit with code 1.

#### Scenario: Missing hub URL
- **WHEN** no hub URL is provided via file, env, or flag
- **THEN** the CLI prints `hub.url is required` and exits with code 1

#### Scenario: Missing hub token
- **WHEN** hub URL is provided but no token via file, env, or flag
- **THEN** the CLI prints `hub.token is required` and exits with code 1

#### Scenario: Invalid concurrency
- **WHEN** `--concurrency 0` is passed
- **THEN** the CLI prints a validation error (concurrency must be >= 1) and exits with code 1
