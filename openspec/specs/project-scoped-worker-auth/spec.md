## Requirements

### Requirement: Project-scoped JWKS verification
The worker auth middleware SHALL verify worker JWTs against the target project's `jwksUri`. The middleware SHALL extract the project identifier from the request body, look up the project, and use its `jwksUri` to verify the JWT signature. If the project has no `jwksUri` configured, the middleware SHALL return HTTP 401.

#### Scenario: Valid JWT verified against project JWKS
- **WHEN** a worker sends a request with a valid JWT to project "alpha" which has `jwksUri: "https://auth.example.com/.well-known/jwks.json"`
- **THEN** the middleware verifies the JWT against that JWKS endpoint and authorizes the request

#### Scenario: Project has no jwksUri configured
- **WHEN** a worker sends a request targeting project "beta" which has `jwksUri: null`
- **THEN** the middleware returns HTTP 401

#### Scenario: Project does not exist
- **WHEN** a worker sends a request targeting project "nonexistent"
- **THEN** the middleware returns HTTP 401

#### Scenario: JWT signature does not match project JWKS
- **WHEN** a worker sends a JWT signed by a different key than the project's JWKS endpoint provides
- **THEN** the middleware returns HTTP 401

### Requirement: JWKS cache per URI
The middleware SHALL cache JWKS key sets per URI using `jose.createRemoteJWKSet`. Multiple projects sharing the same `jwksUri` SHALL share the same cached key set.

#### Scenario: Two projects with same jwksUri
- **WHEN** project "alpha" and project "beta" both have `jwksUri: "https://auth.example.com/.well-known/jwks.json"`
- **THEN** only one remote JWKS fetch occurs for both projects' worker requests

### Requirement: Worker identity from JWT sub
The middleware SHALL produce a `WorkerIdentity` containing `sub` (from JWT `sub` claim) and the verified `project` string. The worker is authorized for the specific project whose JWKS verified the token.

#### Scenario: Worker identity produced
- **WHEN** a JWT with `sub: "worker-1"` is verified against project "alpha"
- **THEN** the handler receives `{ sub: "worker-1", project: "alpha" }`
