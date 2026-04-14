## ADDED Requirements

### Requirement: Book crawler plugin declaration
The book-crawler plugin SHALL be defined via `definePlugin()` with `name: '@rezics/dispatch-worker/book-crawler'`, `capabilities: ['book:crawl', 'book:update']`, `mode: 'http'`, and `trust: 'receipted'`.

#### Scenario: Plugin exports valid definition
- **WHEN** the book-crawler plugin is imported from `@rezics/dispatch-worker/book-crawler`
- **THEN** it exports a valid `DispatchPlugin` with capabilities `['book:crawl', 'book:update']`

### Requirement: Configurable sources
The plugin config SHALL accept a `sources` field as an array of enum values (`'qidian'`, `'jjwxc'`, `'novel'`) with default `['qidian']`.

#### Scenario: Custom sources
- **WHEN** the plugin is configured with `{ sources: ['jjwxc', 'novel'] }`
- **THEN** the plugin uses only jjwxc and novel as data sources

#### Scenario: Default source
- **WHEN** the plugin is configured without a `sources` field
- **THEN** the default source is `['qidian']`

### Requirement: Rate limiting configuration
The plugin config SHALL accept a `rateLimit` field (number, default 10) controlling maximum requests per second. Rate limiting SHALL be applied per-source rather than globally, so tasks targeting different sources execute their HTTP fetches in parallel without blocking each other.

#### Scenario: Custom rate limit
- **WHEN** `rateLimit: 5` is configured
- **THEN** each source makes at most 5 HTTP requests per second independently

#### Scenario: Parallel execution across sources
- **WHEN** two `book:crawl` tasks are running concurrently — one targeting qidian and one targeting jjwxc
- **THEN** both tasks fetch in parallel; the qidian rate limiter does not block the jjwxc fetch

#### Scenario: Same-source serialization
- **WHEN** two `book:crawl` tasks target the same source (both qidian) and the rate limit is 10 req/s
- **THEN** their HTTP fetches are serialized to respect the 100ms minimum interval for that source

### Requirement: Optional proxy support
The plugin config SHALL accept an optional `proxy` field (valid URL string) for routing HTTP requests through a proxy.

#### Scenario: Proxy configured
- **WHEN** `proxy: 'http://proxy.example.com:8080'` is configured
- **THEN** all HTTP requests to sources are routed through the proxy

### Requirement: book:crawl handler
The `book:crawl` handler SHALL fetch a page from the URL in `task.payload.url`, parse book metadata (title, author, chapters, etc.), report progress via `ctx.progress()`, and return the result via `{ strategy: 'webhook', url: task.payload.webhookUrl, data: book }`.

#### Scenario: Successful crawl
- **WHEN** a task with `{ url: 'https://source.com/book/123', webhookUrl: 'https://api.example.com/books' }` is processed
- **THEN** the handler fetches the page, parses book metadata, and returns a webhook result with the parsed data

#### Scenario: Progress reported during crawl
- **WHEN** the crawl handler executes
- **THEN** `ctx.progress()` is called at least twice (e.g., 10% for fetching, 80% for parsing)

### Requirement: book:update handler
The `book:update` handler SHALL check if the book content has changed (e.g., via content hash comparison). If unchanged, it SHALL return `{ strategy: 'discard' }`. If changed, it SHALL re-crawl and return the updated data.

#### Scenario: No changes detected
- **WHEN** the content hash matches the previous crawl
- **THEN** the handler returns `{ strategy: 'discard' }`

#### Scenario: Changes detected
- **WHEN** the content hash differs from the previous crawl
- **THEN** the handler re-crawls and returns updated data via webhook

### Requirement: onLoad initializes HTTP client
The plugin's `onLoad` hook SHALL initialize an HTTP client with the configured rate limiter and optional proxy.

#### Scenario: Plugin loaded
- **WHEN** the plugin's `onLoad` is called with `{ rateLimit: 10, proxy: 'http://proxy.example.com:8080' }`
- **THEN** an HTTP client is initialized with rate limiting and proxy settings
