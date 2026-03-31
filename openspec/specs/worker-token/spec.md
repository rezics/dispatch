## ADDED Requirements

### Requirement: Token obtained via getToken callback
The worker SHALL obtain a JWT by calling the user-provided `getToken()` async function from the worker config. This function is opaque — it may call an IdP SDK, read a file, or return a static token.

#### Scenario: Token obtained at startup
- **WHEN** the worker starts
- **THEN** `getToken()` is called and the returned JWT is used for the first hub request

### Requirement: Token auto-refresh before expiry
The worker SHALL decode the JWT's `exp` claim (without verification) and schedule a refresh at 80% of the token's remaining lifetime. The new token replaces the current one for subsequent requests.

#### Scenario: Token refreshed before expiry
- **WHEN** a token has 600s remaining lifetime
- **THEN** `getToken()` is called again after ~480s to obtain a fresh token

#### Scenario: Token with no exp claim
- **WHEN** the JWT has no `exp` claim
- **THEN** the worker uses the token indefinitely and does not schedule a refresh

### Requirement: Retry on auth failure
If the hub returns HTTP 401 on any request, the worker SHALL immediately call `getToken()` to obtain a fresh token and retry the failed request once. If the retry also returns 401, the worker SHALL log an error and stop.

#### Scenario: Expired token recovered
- **WHEN** the hub returns 401 on a `/tasks/claim` request
- **THEN** the worker calls `getToken()`, obtains a new token, and retries the claim

#### Scenario: Persistent auth failure
- **WHEN** the hub returns 401 on both the original and retried request
- **THEN** the worker logs a fatal auth error and initiates shutdown

### Requirement: Token passed via Authorization header
All HTTP requests to the hub SHALL include the header `Authorization: Bearer <jwt>`. For WebSocket connections, the token SHALL be sent as a header on the upgrade request.

#### Scenario: HTTP request includes token
- **WHEN** the worker sends `POST /tasks/claim`
- **THEN** the request includes `Authorization: Bearer <current-jwt>`

#### Scenario: WS upgrade includes token
- **WHEN** the worker opens a WebSocket connection to the hub
- **THEN** the upgrade request includes `Authorization: Bearer <current-jwt>`
