## MODIFIED Requirements

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
