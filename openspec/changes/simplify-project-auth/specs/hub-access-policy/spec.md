## REMOVED Requirements

### Requirement: Access policy grants project access
**Reason**: Replaced by project-scoped JWKS verification. Worker access is determined by JWT verification against the project's own JWKS endpoint.
**Migration**: Configure `jwksUri` on each project instead of creating access policies.

### Requirement: Access policy has no permissions field
**Reason**: Access policies are removed entirely.
**Migration**: No action needed.

### Requirement: Project scope is a literal project ID
**Reason**: Access policies are removed entirely.
**Migration**: No action needed.

### Requirement: Multiple policies aggregate project access
**Reason**: Access policies are removed entirely. Workers authenticate per-project.
**Migration**: Workers targeting multiple projects make separate requests or share the same JWKS provider across projects.

### Requirement: Policy cache with invalidation
**Reason**: Access policies are removed. JWKS caching is handled per-URI by `jose.createRemoteJWKSet`.
**Migration**: No action needed.
