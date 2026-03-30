## ADDED Requirements

### Requirement: defineWorkerConfig returns typed configuration
The `defineWorkerConfig()` function SHALL accept a configuration object with `hub` (url, getToken), `mode` (default `'http'`), `concurrency` (default 10), and `plugin` array, and return a validated, typed configuration object.

#### Scenario: Minimal config
- **WHEN** `defineWorkerConfig({ hub: { url: 'https://hub.example.com', getToken: () => token }, plugin: [] })` is called
- **THEN** a config object is returned with `mode: 'http'`, `concurrency: 10`, and empty plugin list

#### Scenario: Custom concurrency and mode
- **WHEN** `defineWorkerConfig({ hub: { url: '...' , getToken: fn }, mode: 'ws', concurrency: 50, plugin: [...] })` is called
- **THEN** the config reflects `mode: 'ws'` and `concurrency: 50`

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
