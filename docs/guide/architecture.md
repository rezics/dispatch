# Architecture

Dispatch follows a Hub-and-Worker architecture. A central **Hub** manages the task queue and coordinates work distribution, while **Workers** connect to the Hub to claim and execute tasks.

## System Overview

```
                        +-----------+
                        | Main      |
                        | Server    |
                        +-----+-----+
                              | POST /tasks (submit)
                              | POST /tasks/audit (audited trust)
                              v
+----------+          +-------+--------+          +----------+
| Worker 1 | <------> |                | <------> | Worker 2 |
+----------+   HTTP   |      Hub      |    WS    +----------+
               poll    |               |   push
+----------+          |  - Queue      |          +----------+
| Worker 3 | <------> |  - Reaper     | <------> | Worker 4 |
+----------+   HTTP   |  - Notary     |    WS    +----------+
               poll    |  - Plugins    |   push
                       |  - Dashboard  |
                       +-------+-------+
                               |
                        +------+------+
                        | PostgreSQL  |
                        +-------------+
```

## Hub Internals

The Hub is an Elysia web server with these core modules:

| Module | Responsibility |
| --- | --- |
| **API Layer** | REST endpoints for task submission, claiming, completion, and management |
| **Queue** | Atomic task claiming with `FOR UPDATE SKIP LOCKED`, lease management, and retry logic |
| **Reaper** | Background loop that reclaims expired leases and marks exhausted tasks as failed |
| **WebSocket Manager** | Manages real-time worker connections, dispatches tasks, and tracks progress |
| **Notary** | Verifies completion receipts per project trust level (HMAC-SHA256) |
| **Result Plugin Runner** | Routes completed task results to storage, webhooks, or custom handlers |
| **Auth** | JWT verification, session management, trust policy resolution, and permission-based access control |
| **Dashboard** | Serves the built-in monitoring web UI at `/_dashboard` |

## Worker Internals

The Worker SDK provides a runtime for executing task handler plugins:

| Module | Responsibility |
| --- | --- |
| **Plugin Registry** | Validates, loads, and routes tasks to the correct plugin handler |
| **Token Manager** | Manages JWT authentication tokens for Hub communication |
| **Lease Manager** | (HTTP mode) Polls for tasks, manages lease renewal |
| **WS Connection** | (WS mode) Maintains WebSocket connection, handles real-time dispatch |

## Package Dependency Graph

```
@rezics/dispatch-type          (foundation -- shared types)
    |
    +--- @rezics/dispatch-hub       (depends on type)
    +--- @rezics/dispatch-worker    (depends on type)
    +--- @rezics/dispatch-i18n      (standalone)
    +--- @rezics/dispatch-ui        (depends on type, i18n)
         |
         +--- @rezics/dispatch-hub-dashboard      (depends on ui, type, i18n)
         +--- @rezics/dispatch-worker-dashboard    (depends on ui, type, i18n)
```

## Data Flow

1. A **Main Server** or external client submits a task via `POST /tasks`.
2. The task enters the **queue** with status `pending`.
3. A **Worker** claims the task (HTTP polling or WebSocket push). Status becomes `running`.
4. The Worker executes the task through the matched **plugin handler**.
5. The Worker submits results via `POST /tasks/complete`. For `receipted` trust, a signed `CompletionReceipt` is included.
6. The Hub verifies the receipt (if required), marks the task `done` or `failed`, and routes the result through the **Result Plugin Runner**.
7. The **Reaper** periodically scans for expired leases and reclaims abandoned tasks.

## Database

Dispatch uses PostgreSQL with Prisma ORM. Key tables:

| Table | Purpose |
| --- | --- |
| `Project` | Project configuration including trust level and receipt secret |
| `Worker` | Registered workers with capabilities and connection metadata |
| `Task` | Task queue with status, priority, lease tracking, and retry counts |
| `TaskResult` | Stored results for tasks using the `store` result strategy |
| `UsedNonce` | Anti-replay nonce cache for receipt verification |
| `ResultPlugin` | Per-project result plugin configurations |
| `User` | Dashboard users with optional root privileges and password hash |
| `Session` | Active dashboard sessions with expiry (7-day TTL, cleaned by Reaper) |
| `TrustPolicy` | Policy rules that map JWT claims to permissions and project scopes |
