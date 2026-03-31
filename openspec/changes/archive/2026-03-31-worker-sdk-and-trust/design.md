## Context

Phase 1+2 delivered `@rezics/dispatch-type` (shared interfaces) and `@rezics/dispatch-hub` (Elysia API, Prisma schema, queue engine, reaper, JWT auth). The hub can accept tasks and serve them via HTTP Lease — but no worker client exists yet, trust verification is stubbed, and completed task results go nowhere. This change fills those gaps across four plan phases (3–6), producing a fully operational dispatch loop.

## Goals / Non-Goals

**Goals:**

- Deliver `@rezics/dispatch-worker` as a standalone npm package that any machine can run
- Support both HTTP Lease (pull) and WebSocket (push) communication modes
- Implement the full trust model: `full`, `receipted`, and `audited` completion flows
- Build a pluggable result pipeline so completed tasks can be stored, webhooks fired, or custom handlers invoked
- Keep the worker SDK thin — business logic lives in plugins, the SDK handles only communication, scheduling, and lifecycle

**Non-Goals:**

- Official domain plugins (book-crawler, anime-crawler) — Phase 7
- Dashboards or desktop app — Phases 8–9
- Load testing, partitioning, or production hardening — Phase 10
- Worker-to-worker communication (out of scope entirely)

## Decisions

### 1. Worker SDK as a pure communication layer

**Choice**: The worker SDK handles only connection management, task lifecycle, and plugin orchestration. It never interprets task payloads.

**Rationale**: Mirrors the hub's domain-blind philosophy. Plugin authors own all business logic. The SDK is a reusable shell.

### 2. Bun native WebSocket on both sides

**Choice**: Use Bun's built-in WebSocket support on the worker side and Elysia's built-in WS handler on the hub side. No `ws` npm package.

**Rationale**: Both hub and worker run on Bun. Elysia provides first-class WS support with the same validation/lifecycle hooks as HTTP routes. Bun's `WebSocket` client API is stable. Zero extra dependencies.

**Alternatives considered**:
- `ws` package: Works but adds a Node-oriented dependency when Bun provides the same API natively.
- Socket.io: Too heavy, auto-negotiation features unused, adds protocol overhead.

### 3. Exponential backoff with jitter for WS reconnect

**Choice**: On disconnect, the worker waits `min(baseDelay * 2^attempt + jitter, maxDelay)` before reconnecting. Default base 1s, max 30s.

**Rationale**: Prevents thundering herd when the hub restarts and all workers reconnect simultaneously. Jitter (random 0–1s) further spreads the load.

### 4. HMAC-SHA256 for completion receipts

**Choice**: Receipts are signed with HMAC-SHA256 using a per-project shared secret stored in the `project.receipt_secret` column.

**Rationale**: HMAC is symmetric — the Main Server signs, the hub verifies — using the same secret. Simple, fast, no PKI needed. The secret is provisioned when the project is registered.

**Alternatives considered**:
- RSA/ECDSA asymmetric signing: More secure (Main Server holds private key, hub holds public key) but adds key management complexity. Can be added later as an option.
- No signing (trust worker): Unacceptable for community workers — the whole point of `receipted` mode.

### 5. Result plugin runner as a synchronous pipeline

**Choice**: When a task completes with `status: 'done'`, the result plugin runner executes the matching strategy handler synchronously (within the same request). For `webhook`, this means the HTTP POST fires during the `/tasks/complete` request.

**Rationale**: Simplicity. For Phase 6, synchronous execution is acceptable. If webhook latency becomes a bottleneck, an async queue can be introduced later without changing the plugin interface.

**Alternatives considered**:
- Async queue per result plugin: Better for high-throughput webhook scenarios but premature — adds a second queue system before it's needed.

### 6. Worker concurrency via semaphore

**Choice**: The worker limits concurrent task execution using a counting semaphore (simple counter + queue). When at capacity, new dispatches (WS) or claims (HTTP) are deferred.

**Rationale**: Prevents a worker from accepting more work than it can handle. The semaphore is internal to the SDK; plugins don't need to know about it.

### 7. Lease auto-renewal at 70% elapsed time

**Choice**: In HTTP Lease mode, the worker schedules a renewal timer at `0.7 * leaseDuration` after claiming. If tasks are still running, it extends the lease. If all tasks are done, no renewal is needed.

**Rationale**: 70% gives a comfortable buffer — if the renewal request fails or is slow, there's still 30% of the lease remaining before tasks are reaped. This is the plan's specified behavior.

## Risks / Trade-offs

- **[Synchronous webhook in result plugin]** → High-latency webhooks will slow down `/tasks/complete` responses. Mitigation: document the trade-off; webhook timeout is configurable; async mode is a future enhancement.

- **[HMAC shared secret management]** → Secret must be securely shared between Main Server and hub out of band. Mitigation: secrets are set via `POST /projects` or `PATCH /projects/:id` — transport security (HTTPS) protects them in transit. Future: support asymmetric keys.

- **[WS mode hub memory]** → Each connected worker holds a WS connection in hub memory. At 1000 workers, this is trivial. At 100k, it could be significant. Mitigation: HTTP Lease mode is the default for large-scale batch workloads; WS is for low-latency, lower-count scenarios.

- **[Nonce replay window]** → Receipts have a 60s expiry window. A replay within that window is prevented by the nonce store. After 60s, the receipt is rejected as expired. The nonce store is cleaned by the reaper.

## Open Questions

- Should the worker SDK expose a programmatic API for embedding in other applications (e.g., `createWorker().start()`) in addition to the config-file CLI mode? (Recommendation: yes, CLI wraps the programmatic API.)
- Should webhook result plugins support retry on failure? (Recommendation: not in this phase — add in a future enhancement.)
