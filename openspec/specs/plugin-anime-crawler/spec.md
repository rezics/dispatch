## ADDED Requirements

### Requirement: Anime crawler plugin declaration
The anime-crawler plugin SHALL be defined via `definePlugin()` with `name: '@rezics/dispatch-worker/anime-crawler'`, `capabilities: ['anime:crawl', 'anime:update']`, `mode: 'http'`, and `trust: 'receipted'`.

#### Scenario: Plugin exports valid definition
- **WHEN** the anime-crawler plugin is imported from `@rezics/dispatch-worker/anime-crawler`
- **THEN** it exports a valid `DispatchPlugin` with capabilities `['anime:crawl', 'anime:update']`

### Requirement: Configurable sources
The plugin config SHALL accept a `sources` field as an array of enum values (`'mal'`, `'anilist'`) with default `['mal']`.

#### Scenario: Multiple sources
- **WHEN** the plugin is configured with `{ sources: ['mal', 'anilist'] }`
- **THEN** the plugin can crawl from both MyAnimeList and AniList

### Requirement: Optional API key configuration
The plugin config SHALL accept optional `malApiKey` and `anilistToken` fields for authenticated API access to the respective services.

#### Scenario: MAL API key configured
- **WHEN** `malApiKey: 'my-key'` is configured and `sources` includes `'mal'`
- **THEN** MAL API requests include the API key for authenticated access

#### Scenario: No API key for MAL
- **WHEN** `malApiKey` is not configured and `sources` includes `'mal'`
- **THEN** the plugin uses unauthenticated access (with lower rate limits)

### Requirement: anime:crawl handler
The `anime:crawl` handler SHALL fetch anime metadata (title, episodes, status, genres, synopsis) from the source specified in the task payload, report progress, and return the result via webhook strategy.

#### Scenario: Crawl from MAL
- **WHEN** a task with `{ source: 'mal', animeId: 12345, webhookUrl: 'https://api.example.com/anime' }` is processed
- **THEN** the handler fetches anime data from MAL and returns it via webhook

### Requirement: anime:update handler
The `anime:update` handler SHALL check if the anime data has changed since the last crawl. If unchanged, return `{ strategy: 'discard' }`.

#### Scenario: No updates
- **WHEN** the anime data has not changed since the last crawl
- **THEN** the handler returns `{ strategy: 'discard' }`

### Requirement: Rate limiting per source
The plugin SHALL respect per-source rate limits: MAL API has a 3 req/s limit, AniList GraphQL has a 90 req/min limit. The plugin SHALL enforce these limits internally.

#### Scenario: MAL rate limited
- **WHEN** the plugin sends requests to MAL
- **THEN** it does not exceed 3 requests per second
