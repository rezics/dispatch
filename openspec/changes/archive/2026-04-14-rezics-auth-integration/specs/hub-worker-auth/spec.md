## MODIFIED Requirements

### Requirement: Worker authentication via JWT
Worker routes SHALL be protected by a middleware that extracts the Bearer JWT, verifies it against configured auth providers (JWKS), and resolves project access via access policies. No session cookie authentication is accepted on worker routes. The `AuthProvider` interface SHALL have an optional `audience` field. When `audience` is undefined, JWT audience validation SHALL be skipped.

#### Scenario: Valid JWT with policy match
- **WHEN** a request to a worker route includes a valid Bearer JWT that matches at least one access policy
- **THEN** the request is authorized and the handler receives the worker's `sub` and accessible projects

#### Scenario: Valid JWT with no policy match
- **WHEN** a JWT is valid but matches no access policies
- **THEN** the hub returns HTTP 403 (authenticated but no project access)

#### Scenario: Invalid or expired JWT
- **WHEN** a worker route receives an invalid or expired JWT
- **THEN** the hub returns HTTP 401

#### Scenario: Session cookie on worker route
- **WHEN** a request to a worker route includes a session cookie but no Bearer JWT
- **THEN** the hub returns HTTP 401 (session cookies are not accepted for worker routes)

#### Scenario: JWT without aud claim and provider has no audience
- **WHEN** a JWT has no `aud` claim and the matching auth provider has `audience: undefined`
- **THEN** the JWT is accepted (audience check is skipped)

#### Scenario: JWT without aud claim but provider requires audience
- **WHEN** a JWT has no `aud` claim but the matching auth provider has `audience: "rezics"`
- **THEN** the hub returns HTTP 401 (audience mismatch)
