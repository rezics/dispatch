## ADDED Requirements

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

### Requirement: Plugin tuple registration
The `plugin` field SHALL accept an array of tuples `[PluginDefinition, PluginConfig]` where each plugin's config is validated against the plugin's Zod schema at configuration time.

#### Scenario: Valid plugin config
- **WHEN** a plugin with `config: z.object({ rateLimit: z.number() })` is registered with `{ rateLimit: 10 }`
- **THEN** the config is accepted without error

#### Scenario: Invalid plugin config rejected
- **WHEN** a plugin with `config: z.object({ rateLimit: z.number() })` is registered with `{ rateLimit: 'fast' }`
- **THEN** a Zod validation error is thrown at configuration time

### Requirement: Hub URL validation
The `hub.url` field SHALL be validated as a valid URL string. WebSocket mode requires `wss://` or `ws://` scheme.

#### Scenario: Invalid URL rejected
- **WHEN** `hub.url` is set to `'not-a-url'`
- **THEN** configuration throws a validation error

#### Scenario: WS mode requires ws scheme
- **WHEN** `mode: 'ws'` and `hub.url` is `'https://hub.example.com'`
- **THEN** the URL is automatically converted to `wss://hub.example.com` or configuration accepts both schemes

### Requirement: No process globals in SDK
The worker SDK SHALL NOT reference `process.on`, `process.exit`, `process.env`, or any other Node/Bun process globals. All environment-specific behavior (signal handling, environment variables, debug flags) SHALL be the responsibility of the consuming application.

#### Scenario: SDK importable in browser context
- **WHEN** the SDK is imported in an environment where `process` is undefined
- **THEN** no runtime errors occur during import or configuration
