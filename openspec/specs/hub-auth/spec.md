## ADDED Requirements

### Requirement: JWT verification using JWKS
The hub SHALL verify incoming JWTs by fetching the signing key from the provider's JWKS endpoint using `jose.createRemoteJWKSet`, validating signature, expiration, audience, and issuer.

#### Scenario: Valid JWT accepted
- **WHEN** a request arrives with a valid JWT signed by a configured provider
- **THEN** the request is authenticated and the token claims are extracted

#### Scenario: Expired JWT rejected
- **WHEN** a request arrives with an expired JWT
- **THEN** the hub returns HTTP 401 with an error message indicating token expiration

#### Scenario: Invalid signature rejected
- **WHEN** a request arrives with a JWT signed by an unknown key
- **THEN** the hub returns HTTP 401

### Requirement: Multi-provider support
The hub SHALL support multiple auth providers configured in `hub.config.ts`, each with its own `jwksUri`, `audience`, and `issuer`. The hub tries each provider until one succeeds or all fail.

#### Scenario: Token from second provider
- **WHEN** two providers are configured and a request has a JWT matching the second provider's issuer
- **THEN** the JWT is verified against the second provider and the request is authenticated

### Requirement: JWKS caching
The hub SHALL cache JWKS responses to avoid fetching on every request. The `jose.createRemoteJWKSet` built-in caching is sufficient.

#### Scenario: Repeated requests use cached keys
- **WHEN** 100 requests arrive with JWTs from the same provider within 1 minute
- **THEN** the JWKS endpoint is fetched at most once (relying on jose's cache)

### Requirement: Worker token claims extraction
The hub SHALL extract `sub` (workerId), `project`, `capabilities` (optional), `scope`, and `trust` from verified JWT claims and make them available to downstream handlers.

#### Scenario: Claims available in request context
- **WHEN** a verified JWT contains `{ sub: "w1", project: "crawl", scope: "worker", trust: "full" }`
- **THEN** the Elysia request context exposes these as typed `workerClaims`

### Requirement: Scope guard
The hub SHALL reject requests where the JWT `scope` claim is not `"worker"` for worker-facing endpoints.

#### Scenario: Non-worker scope rejected
- **WHEN** a JWT with `scope: "admin"` is used on `/tasks/claim`
- **THEN** the hub returns HTTP 403

### Requirement: Capability whitelist enforcement
If a JWT includes a `capabilities` claim, the hub SHALL use it as the authoritative capability list, overriding any plugin-declared capabilities during registration or claim.

#### Scenario: JWT capabilities override registration
- **WHEN** a worker registers with capabilities `["book:crawl", "book:update"]` but its JWT has `capabilities: ["book:crawl"]`
- **THEN** the worker is registered with only `["book:crawl"]`

### Requirement: JWT-based dashboard session creation
The hub `POST /auth/login` SHALL continue to accept Bearer JWT tokens for session creation, but SHALL NOT upsert new users into the `User` table. It SHALL validate in fail-fast order: (1) verify JWT signature + expiry (reject malformed/expired tokens before any DB work), (2) DB lookup user by `sub` → `User.id`, (3) reject if not found or `!isRoot`. Only existing root users SHALL be allowed to create sessions via JWT.

#### Scenario: Root user logs in via JWT
- **WHEN** `POST /auth/login` is called with a valid Bearer JWT whose `sub` matches an existing root user
- **THEN** a session is created and the `dispatch_session` cookie is set

#### Scenario: Unknown user attempts JWT login
- **WHEN** `POST /auth/login` is called with a valid Bearer JWT whose `sub` does not match any existing user
- **THEN** the response status is 403 with `{ error: "Dashboard login requires root" }` and no user is created

#### Scenario: Non-root user attempts JWT login
- **WHEN** `POST /auth/login` is called with a valid Bearer JWT whose `sub` matches a non-root user
- **THEN** the response status is 403 with `{ error: "Dashboard login requires root" }`
