## 1. Hub Auth Provider Config

- [ ] 1.1 Make `AuthProvider.audience` optional (`string | undefined`) in `hub/src/auth/jwt.ts`
- [ ] 1.2 Update `verifyWorkerToken` to only pass `audience` to `jose.jwtVerify` when defined
- [ ] 1.3 Add `DISPATCH_AUTH_JWKS_URI`, `DISPATCH_AUTH_ISSUER`, `DISPATCH_AUTH_AUDIENCE` to hub env schema (`hub/src/env.ts`)
- [ ] 1.4 Load auth provider from env in `hub/src/index.ts` — populate `authProviders[]` when both URI and issuer are set
- [ ] 1.5 Add startup log line showing auth provider count and issuer(s)

## 2. Hub Rezics Seed

- [ ] 2.1 Add `DISPATCH_RECEIPT_SECRET` and `DISPATCH_SEED_REZICS` to hub env schema
- [ ] 2.2 Add Rezics project upsert to `hub/prisma/seed.ts` — id `"rezics"`, verification `"audited"`, receiptSecret and jwksUri from env
- [ ] 2.3 Add Rezics access policy upsert to seed — issPattern `"rezics-server"`, claimField `"sub"`, claimPattern `".*"`, projectScope null
- [ ] 2.4 Gate Rezics seed behind `DISPATCH_SEED_REZICS=true`, error if receipt secret missing

## 3. CLI Config Restructure

- [ ] 3.1 Add `[auth]` section to config schema (`cli/src/config.ts`) with `token` and `server_url` fields
- [ ] 3.2 Remove `token` from `[hub]` section in config schema
- [ ] 3.3 Update env overlay — replace `REZICS_HUB_TOKEN`/`DISPATCH_TOKEN` with `REZICS_AUTH_TOKEN` and add `REZICS_AUTH_SERVER_URL`
- [ ] 3.4 Add `auth.token` and `auth.server_url` to `SECRET_KEYS` for redaction
- [ ] 3.5 Update `validateConfigForStart` — remove `hub.token` check (auth.token is now handled by interactive prompt)

## 4. CLI Interactive Token Prompt

- [ ] 4.1 Create `cli/src/auth.ts` — function that checks for `auth.token`, prompts user if missing, writes to `~/.rezics/config.toml`
- [ ] 4.2 Print token creation URL as `${auth.server_url}/settings/tokens` (with sensible default)
- [ ] 4.3 Read token from stdin, validate non-empty, write to config file
- [ ] 4.4 Handle EOF/cancel (exit with non-zero code)
- [ ] 4.5 Integrate into `startCommand` — call auth prompt before `createRezicsWorker`

## 5. CLI Token Exchange

- [ ] 5.1 Create token exchange function in `cli/src/auth.ts` — calls `POST ${server_url}/token/session` with API token as Bearer header
- [ ] 5.2 Update `createRezicsWorker` in `cli/src/worker.ts` — `getToken` callback calls the exchange function instead of returning a static token
- [ ] 5.3 Pass `auth.server_url` through to the worker factory
- [ ] 5.4 Handle exchange errors — 401 (invalid token) vs network failure

## 6. Worker External Result Endpoint

- [ ] 6.1 Add optional `resultEndpoint` to `hub` field in worker config schema (`worker/src/core/config.ts`)
- [ ] 6.2 Update `defineWorkerConfig` to accept and validate `resultEndpoint` URL
- [ ] 6.3 Create external result submitter in `worker/src/core/external-result.ts` — POSTs results to external endpoint with Bearer token, supports batching
- [ ] 6.4 Add retry logic (exponential backoff, 3 attempts) for external submission failures
- [ ] 6.5 Update `LeaseManager` (HTTP mode) — when `resultEndpoint` is set, route completed results to external submitter instead of hub's `/tasks/complete`
- [ ] 6.6 Update `WsConnection` (WebSocket mode) — when `resultEndpoint` is set, submit results externally instead of sending `task:done` message
- [ ] 6.7 Update `SingleRunManager` — same external result routing
- [ ] 6.8 Wire `resultEndpoint` from CLI config (`auth.server_url + /dispatch/results`) into worker config in `cli/src/worker.ts`
