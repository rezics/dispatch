## 1. Hub Auth Provider Config

- [x] 1.1 Make `AuthProvider.audience` optional (`string | undefined`) in `hub/src/auth/jwt.ts`
- [x] 1.2 Update `verifyWorkerToken` to only pass `audience` to `jose.jwtVerify` when defined
- [x] 1.3 Add `DISPATCH_AUTH_JWKS_URI`, `DISPATCH_AUTH_ISSUER`, `DISPATCH_AUTH_AUDIENCE` to hub env schema (`hub/src/env.ts`)
- [x] 1.4 Load auth provider from env in `hub/src/index.ts` — populate `authProviders[]` when both URI and issuer are set
- [x] 1.5 Add startup log line showing auth provider count and issuer(s)

## 2. Hub Rezics Seed

- [x] 2.1 Add `DISPATCH_RECEIPT_SECRET` and `DISPATCH_SEED_REZICS` to hub env schema
- [x] 2.2 Add Rezics project upsert to `hub/prisma/seed.ts` — id `"rezics"`, verification `"audited"`, receiptSecret and jwksUri from env
- [x] 2.3 Add Rezics access policy upsert to seed — issPattern `"rezics-server"`, claimField `"sub"`, claimPattern `".*"`, projectScope null
- [x] 2.4 Gate Rezics seed behind `DISPATCH_SEED_REZICS=true`, error if receipt secret missing

## 3. CLI Config Restructure

- [x] 3.1 Add `[auth]` section to config schema (`cli/src/config.ts`) with `token` and `server_url` fields
- [x] 3.2 Remove `token` from `[hub]` section in config schema
- [x] 3.3 Update env overlay — replace `REZICS_HUB_TOKEN`/`DISPATCH_TOKEN` with `REZICS_AUTH_TOKEN` and add `REZICS_AUTH_SERVER_URL`
- [x] 3.4 Add `auth.token` and `auth.server_url` to `SECRET_KEYS` for redaction
- [x] 3.5 Update `validateConfigForStart` — remove `hub.token` check (auth.token is now handled by interactive prompt)

## 4. CLI Interactive Token Prompt

- [x] 4.1 Create `cli/src/auth.ts` — function that checks for `auth.token`, prompts user if missing, writes to `~/.rezics/config.toml`
- [x] 4.2 Print token creation URL as `${auth.server_url}/settings/tokens` (with sensible default)
- [x] 4.3 Read token from stdin, validate non-empty, write to config file
- [x] 4.4 Handle EOF/cancel (exit with non-zero code)
- [x] 4.5 Integrate into `startCommand` — call auth prompt before `createRezicsWorker`

## 5. CLI Token Exchange

- [x] 5.1 Create token exchange function in `cli/src/auth.ts` — calls `POST ${server_url}/token/session` with API token as Bearer header
- [x] 5.2 Update `createRezicsWorker` in `cli/src/worker.ts` — `getToken` callback calls the exchange function instead of returning a static token
- [x] 5.3 Pass `auth.server_url` through to the worker factory
- [x] 5.4 Handle exchange errors — 401 (invalid token) vs network failure

## 6. Worker External Result Endpoint

- [x] 6.1 Add optional `resultEndpoint` to `hub` field in worker config schema (`worker/src/core/config.ts`)
- [x] 6.2 Update `defineWorkerConfig` to accept and validate `resultEndpoint` URL
- [x] 6.3 Create external result submitter in `worker/src/core/external-result.ts` — POSTs results to external endpoint with Bearer token, supports batching
- [x] 6.4 Add retry logic (exponential backoff, 3 attempts) for external submission failures
- [x] 6.5 Update `LeaseManager` (HTTP mode) — when `resultEndpoint` is set, route completed results to external submitter instead of hub's `/tasks/complete`
- [x] 6.6 Update `WsConnection` (WebSocket mode) — when `resultEndpoint` is set, submit results externally instead of sending `task:done` message
- [x] 6.7 Update `SingleRunManager` — same external result routing
- [x] 6.8 Wire `resultEndpoint` from CLI config (`auth.server_url + /dispatch/results`) into worker config in `cli/src/worker.ts`
