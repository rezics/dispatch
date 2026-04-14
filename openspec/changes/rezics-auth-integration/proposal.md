## Why

The dispatch CLI and hub currently have no way to authenticate against the Rezics ecosystem. Workers cannot prove their identity to the hub, the hub cannot verify tokens from Rezics, and there is no path for task results to flow through the Rezics Main Server. This blocks deploying dispatch as part of Rezics infrastructure.

## What Changes

- **CLI auth setup**: Rename `hub.token` to `auth.token` (with new `[auth]` config section including `server_url`). When the token is missing at startup, interactively prompt the user with a URL to create an API token on the Rezics Main Server.
- **CLI token exchange**: The worker's `getToken` callback calls the Main Server's `POST /token/session` endpoint (documented in `rezics-main-server-feature-plan.md`) to exchange the long-lived API token for a short-lived session JWT on each refresh.
- **Hub auth provider config**: Load `AuthProvider` (JWKS URI, issuer) from environment variables at startup instead of hardcoded empty array. **BREAKING** for hub env config.
- **Hub audience optional**: Make `AuthProvider.audience` optional so tokens without an `aud` claim (like `rezics-session-token`) can be verified.
- **Worker SDK audited project support**: Add a result routing mechanism so workers on audited projects submit results to an external endpoint (Main Server) instead of calling the hub's `/tasks/complete` (which rejects audited projects).
- **Hub seed for Rezics**: Seed script creates a Rezics project (verification: `audited`) and an access policy matching the `rezics-server` issuer.

## Capabilities

### New Capabilities
- `cli-auth`: CLI authentication setup — config restructure (`[auth]` section), interactive token prompt, and token exchange via Main Server API.
- `hub-auth-provider-config`: Hub auth provider bootstrapping from environment variables at startup.
- `worker-external-result`: Worker SDK support for submitting task results to an external endpoint instead of the hub, for audited projects.
- `hub-rezics-seed`: Hub seed data for Rezics integration — project and access policy.

### Modified Capabilities
- `hub-worker-auth`: Make `AuthProvider.audience` optional in JWT verification.
- `worker-config`: Add `auth.token` and `auth.server_url` to replace `hub.token`. Add env vars `REZICS_AUTH_TOKEN`, `REZICS_AUTH_SERVER_URL`.

## Impact

- **CLI config**: `hub.token` renamed to `auth.token`, `REZICS_HUB_TOKEN` renamed to `REZICS_AUTH_TOKEN`. New fields `auth.server_url` / `REZICS_AUTH_SERVER_URL`. Breaking for existing config files.
- **Hub env**: New env vars for auth provider (`DISPATCH_AUTH_JWKS_URI`, `DISPATCH_AUTH_ISSUER`, optional `DISPATCH_AUTH_AUDIENCE`).
- **Hub auth**: `AuthProvider` interface change (`audience` becomes optional). All call sites must handle undefined audience.
- **Worker SDK**: New result routing path. Plugins for audited projects must adopt the external result pattern.
- **Hub seed**: New seed data for Rezics project and access policy. Requires `DISPATCH_RECEIPT_SECRET` env var.
- **External dependency**: Assumes Rezics Main Server implements `POST /token/session` and task result intake endpoint (documented separately in `rezics-main-server-feature-plan.md`).
