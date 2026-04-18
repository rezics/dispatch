## REMOVED Requirements

### Requirement: Optional auth environment variables
**Reason**: `DISPATCH_AUTH_JWKS_URI`, `DISPATCH_AUTH_ISSUER`, and `DISPATCH_AUTH_AUDIENCE` are removed. Auth is now configured per-project via `jwksUri`.
**Migration**: Set `jwksUri` on each project instead of using global environment variables.
