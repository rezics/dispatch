## MODIFIED Requirements

### Requirement: Worker token claims extraction
The hub SHALL extract `sub`, `iss`, and all custom claims from verified JWT payloads and pass them to the identity resolution pipeline, which returns a `ResolvedIdentity` with `sub`, `isRoot`, `permissions`, `projects`, and original `claims`. The `ResolvedIdentity` SHALL replace the previous `WorkerClaims` in the Elysia request context, available as `identity` instead of `workerClaims`.

#### Scenario: Claims available in request context
- **WHEN** a verified JWT contains `{ sub: "w1", iss: "auth.rezics.com", role: "user", project: "crawl" }`
- **THEN** the Elysia request context exposes a `ResolvedIdentity` as `identity` with resolved permissions and project scope

### Requirement: Scope guard
The hub SHALL replace the hard-coded `scope === 'worker'` check with permission-based guards. Each route SHALL declare its required permission, and the middleware SHALL check `hasPermission(identity, requiredPermission)` before allowing access.

#### Scenario: Worker endpoint requires worker permission
- **WHEN** a JWT resolves to an identity with `worker:register` permission and the route requires `worker:register`
- **THEN** the request is allowed

#### Scenario: Missing permission rejected
- **WHEN** a JWT resolves to an identity without `dashboard:view` permission and the route requires `dashboard:view`
- **THEN** the hub returns HTTP 403

#### Scenario: Root user passes all guards
- **WHEN** a JWT resolves to a root user identity
- **THEN** all permission checks pass regardless of the required permission

## MODIFIED Requirements

### Requirement: Multi-provider support
The hub SHALL support multiple auth providers. Providers SHALL be loaded from the `Project` table's `jwksUri` field (existing behavior) plus a hub-level default provider configured at startup. The hub tries each provider until one succeeds or all fail.

#### Scenario: Token from project-level provider
- **WHEN** a project has a `jwksUri` configured and a request has a JWT matching that provider's issuer
- **THEN** the JWT is verified against the project's provider and identity is resolved

#### Scenario: Token from hub-level provider
- **WHEN** no project-level provider matches but a hub-level default provider is configured
- **THEN** the JWT is verified against the hub-level provider
