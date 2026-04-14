## Context

The dispatch system (hub, worker SDK, CLI) currently has auth infrastructure but no configured identity provider. The hub's `authProviders` array is empty, workers pass a static token from config, and there's no integration with Rezics Auth or the Rezics Main Server.

The Rezics Main Server already has:
- An API token system (opaque tokens with scopes, hash-verified)
- A session JWT signing service (issuer: `"rezics-server"`, ES256, JWKS at `/.well-known/jwks.json`)
- A `POST /session/exchange` endpoint for identity token → session JWT

Two new endpoints on the Main Server are documented in `rezics-main-server-feature-plan.md`:
- `POST /token/session` — API token → session JWT
- Task result intake — workers submit results here, Main Server notifies hub via `/tasks/audit`

The hub already supports audited projects where an external server marks tasks complete via HMAC-signed `POST /tasks/audit`. This is the right completion path for Rezics.

## Goals / Non-Goals

**Goals:**
- CLI can authenticate with Rezics by providing a Main Server API token
- Hub verifies worker JWTs against the Rezics Main Server's JWKS
- Workers on audited projects submit results to the Main Server, not the hub
- Hub can be seeded with Rezics project and access policy

**Non-Goals:**
- OAuth/browser-based login flow (API token is sufficient for CLI)
- Social login from CLI (email/password on Rezics Auth is the upstream path; CLI only needs the API token)
- Multi-tenant hub with multiple identity providers (single Rezics provider for now)
- Changes to the Rezics Main Server (documented separately)

## Decisions

### D1: CLI config restructure — `[auth]` section replaces `hub.token`

The token is a Rezics Main Server API token, not a hub token. New config structure:

```toml
[hub]
url = "http://hub:3721"

[auth]
token = "api_xxx"
server_url = "https://rezics.com"
```

Env vars: `REZICS_AUTH_TOKEN`, `REZICS_AUTH_SERVER_URL`. Legacy `REZICS_HUB_TOKEN` / `DISPATCH_TOKEN` aliases are removed (breaking, but this is pre-release).

**Why not keep `hub.token`:** The token authenticates against the Main Server, not the hub. Naming it `hub.token` is misleading and would cause confusion as the system grows.

### D2: Interactive token prompt at CLI startup

When `auth.token` is missing, the CLI prints the Main Server's token creation URL and prompts for input instead of exiting with an error. The entered token is written to `~/.rezics/config.toml`.

The URL is derived from `auth.server_url` (defaulting to a well-known Rezics URL). Format: `${server_url}/settings/tokens`.

**Why interactive over config-only:** Better first-run UX. Users shouldn't need to know the config file structure to get started.

### D3: Hub auth provider from environment variables

Auth providers are loaded from env at startup:

```
DISPATCH_AUTH_JWKS_URI=https://rezics.com/.well-known/jwks.json
DISPATCH_AUTH_ISSUER=rezics-server
DISPATCH_AUTH_AUDIENCE=          # optional, omit to skip aud check
```

Supports a single provider. If `DISPATCH_AUTH_JWKS_URI` and `DISPATCH_AUTH_ISSUER` are both set, a provider is created. Otherwise the array stays empty (backward compatible).

**Why env over database:** Auth providers are infrastructure config, not runtime data. They change with deployments, not with API calls. Env is simpler and avoids a bootstrap chicken-and-egg problem.

**Why single provider, not multi:** Rezics is the only identity provider. Multi-provider support can be added later with indexed env vars (`DISPATCH_AUTH_PROVIDER_0_*`) if needed.

### D4: `AuthProvider.audience` becomes optional

The `AuthProvider` interface changes from `audience: string` to `audience?: string`. When undefined, the `jose.jwtVerify` call omits the audience option entirely (jose skips aud validation when the option is absent).

The Rezics session JWT (`rezics-session-token`) does not set an `aud` claim. Requiring audience would force the Main Server to change its token format — unnecessary coupling.

### D5: Worker external result submission for audited projects

For audited projects, the hub rejects `POST /tasks/complete` ("must use POST /tasks/audit"). Workers must submit results elsewhere.

Approach: **Worker-level config with plugin opt-in.**

The worker config gains a new optional field:

```typescript
hub: {
  url: string
  getToken: () => Promise<string>
  resultEndpoint?: string   // external endpoint for result submission
}
```

When `resultEndpoint` is set:
1. After a plugin handler returns a result, the worker SDK POSTs the result to `resultEndpoint` instead of the hub's `/tasks/complete`
2. The external endpoint (Main Server) is responsible for notifying the hub via `/tasks/audit`
3. The worker SDK does not call `/tasks/complete` at all

The request to the external endpoint includes the worker's session JWT as `Authorization: Bearer` for authentication.

**Why worker-level, not plugin-level:** All tasks for a Rezics worker go to the same Main Server. Per-plugin configuration would be redundant repetition. The worker config is the right place.

**Why not a new result strategy:** The result strategy is about what happens *at the hub*. This is about *where* results go. Different axis of concern.

### D6: Hub seed for Rezics

The seed script gains a `--rezics` flag (or env var `DISPATCH_SEED_REZICS=true`) that creates:

1. **Project**: `id: "rezics"`, `verification: "audited"`, `receiptSecret` from `DISPATCH_RECEIPT_SECRET` env, `jwksUri` from `DISPATCH_AUTH_JWKS_URI` env
2. **AccessPolicy**: `issPattern: "rezics-server"`, `claimField: "sub"`, `claimPattern: ".*"`, `projectScope: null` (global)

This is idempotent — re-running the seed upserts rather than duplicates.

## Risks / Trade-offs

**[API token as sole auth path]** If the API token is compromised, the attacker can mint session JWTs. → Mitigation: API tokens have scopes (require `dispatch:session`), can be revoked instantly via the Main Server web UI, and can have expiry dates. The session JWT itself is short-lived (900s).

**[Single auth provider]** Only one identity provider is supported. → Acceptable for now. The env-based config can be extended to indexed providers later without breaking changes.

**[Result endpoint reliability]** If the Main Server is down when the worker tries to submit results, the task is stuck (claimed but never completed). → The hub's reaper will eventually reclaim it based on `maxTaskHoldTime`. The worker SDK should retry the result submission with backoff before giving up.

**[Breaking config change]** Renaming `hub.token` to `auth.token` breaks existing config files. → Pre-release software, no deployed users yet. Clean break is better than legacy aliases.
