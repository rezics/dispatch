## REMOVED Requirements

### Requirement: Auth provider from environment
**Reason**: Global auth providers are replaced by per-project `jwksUri` configuration. Each project manages its own JWKS endpoint.
**Migration**: Set `jwksUri` on each project via the dashboard or API instead of using environment variables.

### Requirement: Startup logging for auth providers
**Reason**: No global auth providers to log. Project JWKS configuration is visible via the project API.
**Migration**: No action needed.
