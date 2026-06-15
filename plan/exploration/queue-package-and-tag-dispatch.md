---
status: draft
tags:
  - exploration
  - dispatch
  - queue
  - tag-routing
---

# Queue Package and Tag-Based Dispatch Exploration

## Context

Dispatch currently owns both the coordination/control plane and the queue
lifecycle. The queue side includes task creation, claim, lease renewal,
completion, retry, recurrence, priority ordering, and reaper behavior.

The original question was whether the queue/dispatch core should be replaced by
an open-source queue project. The exploration refined that into a smaller and
cleaner boundary:

- Dispatch should keep worker coordination, auth, project permission checks,
  receipt/audit verification, result routing, and dashboards.
- The queue layer should be separable, whether it remains self-written or is
  backed by another product.
- The queue layer does not need to understand project permissions. It only
  needs tag/query semantics and task lifecycle primitives.

## Current Shape

The current implementation is a Postgres-backed pull queue:

```text
Task pending
  -> claim with FOR UPDATE SKIP LOCKED
  -> running with lease
  -> complete / fail / retry
  -> reaper reclaims expired leases
```

It is embedded in the Hub and coupled to Dispatch-specific concerns:

- Project configuration.
- Worker identity and project access.
- Completion receipts and anti-replay nonces.
- Result plugins.
- Recurrence reset.
- Dashboard/API task views.

That coupling makes it hard to replace the queue kernel directly, but it also
shows the correct extraction point: keep the Dispatch-specific concerns in Hub,
and move only the task lifecycle and tag-query queue operations behind a
package-level contract.

## Refined Model

The queue does not need a first-class `project` concept. Dispatch maps project
permissions to allowed query/tag scopes.

User or system request:

```text
project:rezics tag:crawler tag:book -tag:paused
```

Dispatch validates and normalizes the request:

```text
caller -> allowed tag/query scope
requested query -> parsed query AST
effective query -> safe queue query
```

Only the effective queue query reaches the queue backend.

```text
Client / Worker
     |
     v
Dispatch Hub
  - parse query
  - authz against project/user/worker scope
  - choose lane/scheduler policy
  - verify completion receipt/audit
  - route results
     |
     v
Queue Backend
  - tags
  - visible_at
  - lease
  - retry/reinsert
  - ack/fail
```

## Priority May Not Be Required

Full priority queues become complicated once combined with tags, fairness,
aging, retries, and filtering. A simpler model may be enough:

- Use tags/lane tags instead of numeric priority.
- Example lanes: `lane:fast`, `lane:normal`, `lane:slow`.
- Dispatch selects a lane by policy, then claims from that lane.
- Selection can start as weighted random and evolve to weighted round-robin or
  deficit round-robin.

Example:

```text
fast   60%
normal 30%
slow   10%
```

This avoids maintaining a general-purpose priority scheduler while still giving
the product control over throughput and responsiveness.

## Retry Semantics

In a pull queue, retry means making the task visible to future claims again.
There is no need for the queue to notify workers.

Minimum retry state transition:

```text
leased/running
  -> fail retryable
  -> attempts += 1
  -> visible_at = now + backoff
  -> lease cleared
  -> pending again
```

The more interesting requirement is retry position: a retried task may need to
be reinserted near the front of its original lane/tag, and retry attempts may
increase its urgency.

Avoid promising exact "insert at position 100" semantics. Exact rank insertion
is expensive under concurrent claim/ack/fail. The better contract is approximate:

```text
retry attempt 1 -> reinsert behind a larger prefix
retry attempt 2 -> reinsert closer to the front
retry attempt 3 -> reinsert very close to the front
```

This can be implemented with a sortable key:

```text
claim WHERE visible_at <= now AND tags match query
ORDER BY sort_key ASC, created_seq ASC
LIMIT n
```

Retry policy adjusts `sort_key` rather than physically moving tasks in a list.

## Queue Package Direction

Regardless of whether an external queue backend is adopted, queue code should be
split into packages.

Proposed package boundary:

```text
@rezics/dispatch-queue-contract
  Query AST
  QueueTask types
  QueueBackend interface
  conformance tests

@rezics/dispatch-queue-postgres
  Current self-written Postgres implementation
  tag query + lease + ack/fail + retry reinsert

@rezics/dispatch-queue-http
  HTTP client/server adapter for remote queue backends

optional adapters
  @rezics/dispatch-queue-pgboss
  @rezics/dispatch-queue-river
  @rezics/dispatch-queue-nats
```

The Hub should depend on the contract, not directly on the implementation.

## Minimal Queue Contract

The queue contract can stay small:

```ts
interface QueueBackend {
  enqueue(input: {
    id: string
    payload: unknown
    tags: string[]
    visibleAt?: Date
    sortKey?: string
    maxAttempts?: number
  }): Promise<void>

  claim(input: {
    query: QueueQuery
    leaseSeconds: number
    count: number
    claimant: string
  }): Promise<QueueTask[]>

  heartbeat(input: {
    claimant: string
    leaseSeconds: number
  }): Promise<{ extended: number }>

  ack(input: {
    ids: string[]
    claimant: string
  }): Promise<void>

  fail(input: {
    id: string
    claimant: string
    retryable: boolean
    error: string
    nextVisibleAt?: Date
    nextSortKey?: string
  }): Promise<void>
}
```

Query should be parsed into an AST rather than passed as raw strings:

```ts
interface QueueQuery {
  mustTags?: string[]
  anyTags?: string[]
  notTags?: string[]
  status?: string[]
  visibleBefore?: Date
}
```

## Self-Written Queue Feasibility

With priority reduced to lane/tag selection and retry reduced to reinsert
ordering, the self-written queue is feasible.

The core data model is straightforward:

```text
QueueTask
  id
  payload
  tags[]
  status: pending | leased | done | dead
  visible_at
  sort_key
  lease_owner
  lease_expires_at
  attempts
  max_attempts
  last_error
  created_at
```

Postgres can support this with:

```text
GIN index on tags
claim index on status, visible_at, sort_key
FOR UPDATE SKIP LOCKED for concurrent claim
```

The important restraint is to avoid rebuilding a generic queue platform. The
self-written implementation should focus on:

- Tag-filtered pull claim.
- Lease and heartbeat.
- Ack/fail.
- Retry reinsert by `sort_key`.
- Optional delayed visibility via `visible_at`.

## External Backend Feasibility

External products are still worth testing, but none should dictate the Dispatch
domain model.

Likely candidates:

- pg-boss: strong Postgres job queue candidate; useful if we want mature retry,
  backoff, cron, dead letter, and operational tooling. Tags/query would need an
  adapter layer.
- River: strong Postgres-backed queue platform in Go; useful if a separate
  HTTP/gRPC queue service is acceptable.
- NATS JetStream: good for channel/subject-based distribution and ack/redelivery
  if we lean into lane tags and avoid generic priority.
- RabbitMQ: good for topic/routing-key based delivery and channel-style
  scheduling, but less natural for rich task search/admin views.
- BullMQ: mature Redis queue; reasonable if Redis is acceptable, less aligned
  with tag-query-first semantics.
- Graphile Worker: close to current Postgres architecture, but more executor/job
  oriented than tag-query oriented.

External adoption should be evaluated as an adapter spike after the queue
contract exists.

## Working Conclusion

Queue can probably remain self-written if the requirement is intentionally kept
small:

```text
tag query + lane selection + lease + retry reinsert
```

External queue backends become more attractive if Dispatch wants to offload a
broader task-management surface:

```text
cron + backoff policies + dead letter + dashboard + retention + admin tooling
```

Either way, the queue must be extracted into a package. That extraction is the
next durable step because it clarifies the boundary before choosing whether to
keep the current implementation, replace it, or support multiple backends.

