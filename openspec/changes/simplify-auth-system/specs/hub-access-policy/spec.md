## ADDED Requirements

### Requirement: Access policy grants project access
An access policy SHALL map JWT claims to project access. When a JWT's `iss` claim matches the policy's `issPattern` (glob) and the value of the claim field named by `claimField` matches `claimPattern` (regex), the worker is granted access to the project specified by `projectScope`.

#### Scenario: Policy matches and grants project access
- **WHEN** a JWT with `iss: "accounts.google.com"` and `email: "alice@myco.com"` is evaluated against a policy `{ issPattern: "accounts.google.com", claimField: "email", claimPattern: ".*@myco\\.com$", projectScope: "crawl" }`
- **THEN** the worker is granted access to project `"crawl"`

#### Scenario: Policy with null projectScope grants global access
- **WHEN** a JWT matches a policy with `projectScope: null`
- **THEN** the worker is granted access to all projects

#### Scenario: Issuer glob matching
- **WHEN** a JWT has `iss: "auth.us.example.com"` and a policy has `issPattern: "auth.*.example.com"`
- **THEN** the policy matches (glob `*` matches a single segment, not dots)

#### Scenario: No policy matches
- **WHEN** a JWT does not match any access policy's issuer or claim criteria
- **THEN** the worker has access to zero projects and cannot claim or complete tasks

### Requirement: Access policy has no permissions field
An access policy SHALL NOT have a `permissions` field. A matching policy means the JWT is a worker on the specified project. All worker capabilities (register, claim, complete, renew lease) are implied by project access.

#### Scenario: Policy only specifies project access
- **WHEN** a new access policy is created via `POST /policies`
- **THEN** the request body accepts `issPattern`, `claimField`, `claimPattern`, and optional `projectScope` — no `permissions` field

### Requirement: Project scope is a literal project ID
The `projectScope` field on an access policy SHALL be treated as a literal project ID, not as a JWT claim field name.

#### Scenario: projectScope is a literal ID
- **WHEN** a policy has `projectScope: "my-project"` and a JWT matches
- **THEN** the worker is granted access to the project with ID `"my-project"` (not the value of a JWT claim named `"my-project"`)

### Requirement: Multiple policies aggregate project access
When multiple access policies match a JWT, the worker's project access SHALL be the union of all matched project scopes. If any matched policy has `projectScope: null`, the worker has global access.

#### Scenario: Two policies match different projects
- **WHEN** a JWT matches policy A (projectScope: "alpha") and policy B (projectScope: "beta")
- **THEN** the worker has access to projects `["alpha", "beta"]`

#### Scenario: One global policy overrides project-scoped
- **WHEN** a JWT matches policy A (projectScope: "alpha") and policy B (projectScope: null)
- **THEN** the worker has global access (`"*"`)

### Requirement: Policy cache with invalidation
Access policies SHALL be cached in memory for 30 seconds. Creating, updating, or deleting a policy SHALL immediately invalidate the cache.

#### Scenario: Cache hit within TTL
- **WHEN** two JWT resolutions occur within 30 seconds
- **THEN** the second resolution uses cached policies without querying the database

#### Scenario: Cache invalidated on policy change
- **WHEN** a policy is created, updated, or deleted
- **THEN** the next JWT resolution loads fresh policies from the database
