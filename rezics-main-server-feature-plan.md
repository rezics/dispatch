# Rezics Main Server — Dispatch Integration Features

Features needed on the Rezics Main Server to support the dispatch CLI and worker ecosystem.

## A. Token Session Endpoint

**Endpoint:** `POST /token/session`

**Purpose:** Allow a Rezics API token to be exchanged for a short-lived session JWT (`rezics-session-token`). This is the authentication path for the dispatch CLI — users create an API token via the web UI and provide it to the CLI, which exchanges it for JWTs on demand.

**Behavior:**
1. Authenticate the request using `tokenService.authenticateFromHeader()` (existing)
2. Verify the API token has the required scope (e.g., `dispatch:worker` or similar)
3. Look up the token owner's `unitId` and `role`
4. Call `signRezicsSessionToken({ unitId, role })` (existing)
5. Return `{ token: "<jwt>" }`

**Auth:** API token via `Authorization: Bearer <api_token>`

**Scope requirement:** A new scope should gate access — not every API token should be able to mint session JWTs for dispatch. Suggested scope: `dispatch` with permission `session` (i.e., `{ dispatch: ["session"] }`).

**Notes:**
- The session JWT has issuer `"rezics-server"`, signed with the server-local ES256 key
- Default TTL is 900s (15 min); the CLI's `TokenManager` will call this endpoint repeatedly to refresh
- The API token itself is long-lived (user-controlled expiry)

---

## B. Task Result Intake Endpoint

**Endpoint:** `POST /dispatch/results` (or similar path)

**Purpose:** Receive task completion data directly from workers. In the Rezics dispatch model, workers submit results to the Main Server (not to the hub). The Main Server processes the data and then notifies the hub that the tasks are complete.

**Behavior:**
1. Authenticate the request — worker presents its `rezics-session-token` as `Authorization: Bearer <jwt>`
2. Validate and verify the session JWT using `verifyRezicsSessionToken()` (existing)
3. Accept the result payload: `{ taskId, project, type, data }`
4. Process/store the result data as appropriate for the task type
5. Notify the hub via `POST /tasks/audit` with HMAC-SHA256 signature

**Hub notification detail:**
- The hub's `/tasks/audit` endpoint requires: `{ taskIds, project, signature }`
- Signature is HMAC-SHA256 of sorted taskIds + project, using the project's `receiptSecret`
- The Main Server must be configured with:
  - **Hub URL** — where to send the audit notification (env: e.g., `DISPATCH_HUB_URL`)
  - **Project receipt secret** — shared secret for HMAC signing (env: e.g., `DISPATCH_RECEIPT_SECRET`)

**Open questions:**
- Should this be a single generic endpoint, or per-task-type endpoints?
- Should the Main Server batch audit notifications (multiple tasks) or send them one at a time?
- Error handling: if the hub audit call fails, should the Main Server retry? Queue for later?

---

## Configuration

The Main Server needs new environment variables for the dispatch integration:

```
# Hub connection (for audit notifications)
DISPATCH_HUB_URL=http://hub:3721
DISPATCH_RECEIPT_SECRET=<shared-hmac-secret>
DISPATCH_PROJECT_ID=rezics
```
