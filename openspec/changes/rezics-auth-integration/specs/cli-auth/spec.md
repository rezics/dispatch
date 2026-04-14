## ADDED Requirements

### Requirement: Auth config section
The CLI config SHALL support an `[auth]` section with `token` (string) and `server_url` (string) fields. The `hub.token` field SHALL be removed. Environment variables `REZICS_AUTH_TOKEN` and `REZICS_AUTH_SERVER_URL` SHALL override the config file values. Legacy env vars `REZICS_HUB_TOKEN` and `DISPATCH_TOKEN` SHALL be removed.

#### Scenario: Auth section in config file
- **WHEN** the config file contains `[auth]` with `token = "api_xxx"` and `server_url = "https://rezics.com"`
- **THEN** the loaded config has `auth.token = "api_xxx"` and `auth.server_url = "https://rezics.com"`

#### Scenario: Env var override
- **WHEN** `REZICS_AUTH_TOKEN=api_yyy` is set and the config file has `auth.token = "api_xxx"`
- **THEN** the loaded config has `auth.token = "api_yyy"`

#### Scenario: Hub section no longer accepts token
- **WHEN** the config file contains `[hub]` with `token = "xxx"`
- **THEN** the token value is ignored (not loaded into config)

### Requirement: Interactive token prompt
When `auth.token` is not configured and the CLI runs `rezics start`, the CLI SHALL print a URL where the user can create an API token and prompt for interactive input. The URL SHALL be `${auth.server_url}/settings/tokens` (or a default if `server_url` is also missing). Upon receiving valid input, the CLI SHALL write the token to `~/.rezics/config.toml`.

#### Scenario: Missing token triggers prompt
- **WHEN** `rezics start` is run with no `auth.token` configured
- **THEN** the CLI prints a message with the token creation URL and waits for user input

#### Scenario: User provides token interactively
- **WHEN** the user pastes a token string at the prompt
- **THEN** the CLI writes `[auth]\ntoken = "<value>"` to `~/.rezics/config.toml` and continues startup

#### Scenario: User cancels prompt
- **WHEN** the user sends EOF (Ctrl+D) or empty input at the prompt
- **THEN** the CLI exits with a non-zero exit code

### Requirement: Token exchange via Main Server
The CLI SHALL use the `auth.token` (API token) to obtain a short-lived session JWT from the Main Server's `POST /token/session` endpoint. The worker's `getToken` callback SHALL call this endpoint on each invocation, sending the API token as `Authorization: Bearer <api_token>` and returning the JWT from the response.

#### Scenario: Successful token exchange
- **WHEN** `getToken` is called and the Main Server returns `{ token: "eyJ..." }`
- **THEN** the callback returns the JWT string

#### Scenario: Main Server rejects API token
- **WHEN** `getToken` is called and the Main Server returns 401
- **THEN** the callback throws an error that propagates as `AuthFatalError` in the worker

#### Scenario: Main Server unreachable
- **WHEN** `getToken` is called and the Main Server connection fails
- **THEN** the callback throws an error (worker SDK handles retry via `TokenManager`)

### Requirement: Auth token redaction
The `auth.token` value SHALL be redacted as `***` in the `rezics config` output, same as other secrets.

#### Scenario: Config display redacts auth token
- **WHEN** `rezics config` is run with `auth.token` configured
- **THEN** the output shows `auth.token = "***"`
