## Requirements

### Requirement: Auth provider from environment
The hub SHALL load an auth provider from environment variables at startup. When both `DISPATCH_AUTH_JWKS_URI` and `DISPATCH_AUTH_ISSUER` are set, the hub SHALL create an `AuthProvider` with those values and optionally `DISPATCH_AUTH_AUDIENCE`. When either is missing, the `authProviders` array SHALL remain empty.

#### Scenario: Both env vars set without audience
- **WHEN** `DISPATCH_AUTH_JWKS_URI=https://rezics.com/.well-known/jwks.json` and `DISPATCH_AUTH_ISSUER=rezics-server` are set, and `DISPATCH_AUTH_AUDIENCE` is not set
- **THEN** the hub starts with one auth provider: `{ jwksUri: "https://...", issuer: "rezics-server", audience: undefined }`

#### Scenario: All three env vars set
- **WHEN** `DISPATCH_AUTH_JWKS_URI`, `DISPATCH_AUTH_ISSUER`, and `DISPATCH_AUTH_AUDIENCE=rezics` are all set
- **THEN** the hub starts with one auth provider including `audience: "rezics"`

#### Scenario: Missing JWKS URI
- **WHEN** `DISPATCH_AUTH_ISSUER` is set but `DISPATCH_AUTH_JWKS_URI` is not
- **THEN** the hub starts with an empty `authProviders` array (no error)

#### Scenario: Missing issuer
- **WHEN** `DISPATCH_AUTH_JWKS_URI` is set but `DISPATCH_AUTH_ISSUER` is not
- **THEN** the hub starts with an empty `authProviders` array (no error)

### Requirement: Startup logging for auth providers
The hub SHALL log the number of configured auth providers at startup, and for each provider, log the issuer (but not the JWKS URI, which may be sensitive).

#### Scenario: Provider configured
- **WHEN** the hub starts with one auth provider for issuer `"rezics-server"`
- **THEN** the startup log includes a message like `Auth providers: 1 (rezics-server)`

#### Scenario: No providers configured
- **WHEN** the hub starts with no auth provider env vars
- **THEN** the startup log includes a message like `Auth providers: 0 (worker auth disabled)`
