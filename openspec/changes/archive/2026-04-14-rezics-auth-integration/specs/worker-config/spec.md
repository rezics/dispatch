## MODIFIED Requirements

### Requirement: defineWorkerConfig returns typed configuration
The `defineWorkerConfig()` function SHALL accept a configuration object with `hub` (url, getToken, optional resultEndpoint), `mode` (default `'http'`), `concurrency` (default 10), and `plugin` array, and return a validated, typed configuration object.

#### Scenario: Minimal config
- **WHEN** `defineWorkerConfig({ hub: { url: 'https://hub.example.com', getToken: () => token }, plugin: [] })` is called
- **THEN** a config object is returned with `mode: 'http'`, `concurrency: 10`, empty plugin list, and `hub.resultEndpoint: undefined`

#### Scenario: Config with resultEndpoint
- **WHEN** `defineWorkerConfig({ hub: { url: '...', getToken: fn, resultEndpoint: 'https://rezics.com/dispatch/results' }, plugin: [...] })` is called
- **THEN** the config reflects `hub.resultEndpoint: 'https://rezics.com/dispatch/results'`

#### Scenario: Custom concurrency and mode
- **WHEN** `defineWorkerConfig({ hub: { url: '...' , getToken: fn }, mode: 'ws', concurrency: 50, plugin: [...] })` is called
- **THEN** the config reflects `mode: 'ws'` and `concurrency: 50`
