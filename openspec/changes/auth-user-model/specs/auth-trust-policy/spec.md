## ADDED Requirements

### Requirement: TrustPolicy model
The system SHALL store trust policies in a `TrustPolicy` database table with fields: `id` (String, auto-generated UUID), `issPattern` (String, glob pattern for JWT issuer matching), `claimField` (String, the JWT claim to inspect), `claimPattern` (String, regex pattern to match against the claim value), `permissions` (String[], granted permission strings), `projectScope` (String, nullable — when set, names the JWT claim field whose value determines project binding; when null, permissions apply to all projects), `createdBy` (String, sub of the user who created the policy), `createdAt` (DateTime).

#### Scenario: Create a policy for owners
- **WHEN** a policy is created with `issPattern: "auth.rezics.com"`, `claimField: "role"`, `claimPattern: "^owner$"`, `permissions: ["admin:*", "dashboard:*"]`, `projectScope: null`
- **THEN** the policy is persisted and retrievable by ID

#### Scenario: Create a project-scoped policy
- **WHEN** a policy is created with `issPattern: "*.rezics.com"`, `claimField: "role"`, `claimPattern: "^user$"`, `permissions: ["worker:register", "task:claim", "task:complete", "dashboard:view"]`, `projectScope: "project"`
- **THEN** the policy is persisted with the project scope referencing the `project` JWT claim

### Requirement: Policy matching by issuer glob
The system SHALL match a JWT's `iss` claim against a policy's `issPattern` using glob matching where `*` matches any single domain segment (e.g. `*.rezics.com` matches `auth.rezics.com` and `worker.rezics.com` but not `sub.auth.rezics.com`).

#### Scenario: Wildcard subdomain match
- **WHEN** a JWT has `iss: "auth.rezics.com"` and a policy has `issPattern: "*.rezics.com"`
- **THEN** the policy matches

#### Scenario: Exact issuer match
- **WHEN** a JWT has `iss: "auth.rezics.com"` and a policy has `issPattern: "auth.rezics.com"`
- **THEN** the policy matches

#### Scenario: Wildcard does not match nested subdomains
- **WHEN** a JWT has `iss: "sub.auth.rezics.com"` and a policy has `issPattern: "*.rezics.com"`
- **THEN** the policy does not match

### Requirement: Policy matching by claim regex
The system SHALL match the value of the JWT claim specified by `claimField` against the policy's `claimPattern` as a regular expression.

#### Scenario: Regex match
- **WHEN** a JWT has `role: "owner"` and a policy has `claimField: "role"`, `claimPattern: "^(owner|admin)$"`
- **THEN** the policy matches

#### Scenario: Regex no match
- **WHEN** a JWT has `role: "viewer"` and a policy has `claimField: "role"`, `claimPattern: "^owner$"`
- **THEN** the policy does not match

### Requirement: Policy CRUD API
The hub SHALL expose REST endpoints for trust policy management: `GET /policies` (list all), `POST /policies` (create), `PATCH /policies/:id` (update), `DELETE /policies/:id` (delete). All endpoints SHALL require `admin:policies` permission.

#### Scenario: Create policy via API
- **WHEN** an authenticated request with `admin:policies` permission sends `POST /policies` with valid policy data
- **THEN** a new policy is created and returned with its generated ID

#### Scenario: Unauthorized policy access
- **WHEN** a request without `admin:policies` permission sends `GET /policies`
- **THEN** the hub returns HTTP 403

#### Scenario: Delete policy
- **WHEN** an authenticated request with `admin:policies` permission sends `DELETE /policies/:id`
- **THEN** the policy is removed from the database

### Requirement: Policy caching
The hub SHALL cache loaded policies in memory and invalidate the cache when any policy is created, updated, or deleted via the API. The cache SHALL have a maximum TTL of 30 seconds as a fallback.

#### Scenario: Policy change invalidates cache
- **WHEN** a new policy is created via `POST /policies`
- **THEN** the next identity resolution uses the updated policy set without waiting for TTL expiry
