## MODIFIED Requirements

### Requirement: defineWorkerConfig returns typed configuration
The `defineWorkerConfig()` function SHALL accept a configuration object with `hub` (url, getToken), `mode` (`'http'`, `'ws'`, or `'single-run'`, default `'http'`), `concurrency` (default 10), `plugin` array, optional `heartbeatInterval` (default 60000ms), and mode-specific options. For `'single-run'` mode, `timeout` is required and `claimCount` is optional. The function SHALL return a validated, typed configuration object. The function SHALL NOT reference any process globals (`process.env`, `process.on`, etc.).

#### Scenario: Minimal config
- **WHEN** `defineWorkerConfig({ hub: { url: 'https://hub.example.com', getToken: () => token }, plugin: [] })` is called
- **THEN** a config object is returned with `mode: 'http'`, `concurrency: 10`, `heartbeatInterval: 60000`, and empty plugin list

#### Scenario: Custom concurrency and mode
- **WHEN** `defineWorkerConfig({ hub: { url: '...' , getToken: fn }, mode: 'ws', concurrency: 50, plugin: [...] })` is called
- **THEN** the config reflects `mode: 'ws'` and `concurrency: 50`

#### Scenario: Single-run mode config
- **WHEN** `defineWorkerConfig({ hub: { url: '...' , getToken: fn }, mode: 'single-run', timeout: 120000, claimCount: 500, plugin: [...] })` is called
- **THEN** the config reflects `mode: 'single-run'`, `timeout: 120000`, and `claimCount: 500`

#### Scenario: Single-run without timeout rejected
- **WHEN** `defineWorkerConfig({ hub: { url: '...' , getToken: fn }, mode: 'single-run', plugin: [] })` is called without a `timeout` value
- **THEN** a validation error is thrown

## ADDED Requirements

### Requirement: No process globals in SDK
The worker SDK SHALL NOT reference `process.on`, `process.exit`, `process.env`, or any other Node/Bun process globals. All environment-specific behavior (signal handling, environment variables, debug flags) SHALL be the responsibility of the consuming application.

#### Scenario: SDK importable in browser context
- **WHEN** the SDK is imported in an environment where `process` is undefined
- **THEN** no runtime errors occur during import or configuration
