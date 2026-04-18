## Context

The dispatch system currently supports one-shot tasks with static priority (default 5, no enforced range). Tasks move through `pending → running → done/failed` and stay terminal. The system will onboard 3M+ records from a legacy system, many requiring periodic re-processing (book metadata refresh, game listings). At this scale, low-priority tasks can starve without aging, and one-shot semantics force external systems to re-create tasks on a schedule.

Key existing infrastructure:
- **Claim query** (`queue/claim.ts`): Already orders by `priority DESC, scheduledAt ASC` with `FOR UPDATE SKIP LOCKED`
- **Reaper** (`reaper/reaper.ts`): Runs on a 30s interval, handles lease expiry and nonce cleanup
- **Composite index**: `(project, status, priority DESC, scheduledAt ASC)` already exists on Task

## Goals / Non-Goals

**Goals:**
- Recurring tasks that auto-reset to pending on completion with configurable interval + jitter
- Priority range 0–1000 with `basePriority` to track original value
- Project-level priority aging that gradually increases effective priority of stale pending tasks
- Aging sweeper that minimizes write overhead at scale (only updates when integer boundary crossed)

**Non-Goals:**
- Per-task aging rates (project-level only for now)
- Task deduplication for recurring tasks (out of scope)
- UI/dashboard changes for recurring task visualization
- Automatic migration of legacy data (separate effort)

## Decisions

### 1. Recurrence reset at completion time (Option A)

When `completeTasks()` processes a done task with `recurrenceInterval != null`, it immediately resets the task to pending instead of marking it done.

**Reset logic:**
- `status = 'pending'`
- `finishedAt = now` (records last completion time)
- `scheduledAt = now + recurrenceInterval + random(0, recurrenceJitter ?? 0)`
- `priority = basePriority` (reset aging)
- `attempts = 0`
- `workerId = null`, `leaseExpiresAt = null`, `maxHoldExpiresAt = null`, `startedAt = null`

**Why not Option B (reaper-based reset):** Option A is simpler, has no observability gap where the task appears "done" during cooldown, and doesn't add load to the reaper. The result plugin still runs before the reset, so `TaskResult` data is preserved across cycles.

**Alternative considered:** A separate `RecurringTaskTemplate` model that spawns new Task instances. Rejected because it doubles the schema complexity and the reset-in-place approach is sufficient — `finishedAt` serves as the last-completion timestamp.

### 2. Separate aging sweeper (not inline in reaper)

A new `startAgingSweeper()` function runs on a separate timer (~5 min default), decoupled from the 30s reaper loop.

**Why separate:** The reaper's 30s cadence is critical for lease recovery. Aging is non-urgent and the query is heavier — coupling them risks slowing down lease recovery or running expensive aging queries too frequently.

**Aging query strategy:** Only update tasks where the computed priority has crossed an integer boundary since the last stored value:

```sql
UPDATE "Task" t
SET "priority" = LEAST(
    p."agingMaxPriority",
    t."basePriority" + FLOOR(p."agingRate" * EXTRACT(EPOCH FROM (NOW() - t."scheduledAt")) / 86400)
  )
FROM "Project" p
WHERE t."project" = p."id"
  AND t."status" = 'pending'
  AND p."agingRate" IS NOT NULL
  AND t."priority" < LEAST(
    p."agingMaxPriority",
    t."basePriority" + FLOOR(p."agingRate" * EXTRACT(EPOCH FROM (NOW() - t."scheduledAt")) / 86400)
  )
```

With `agingRate = 1` (1 point/day), most 5-minute ticks produce zero writes. Only tasks crossing a day boundary get updated.

**Alternative considered:** Computing effective priority at claim time in the ORDER BY clause. Rejected because it prevents the existing composite index from optimizing the sort, and makes the current effective priority invisible for monitoring.

### 3. basePriority + priority dual fields

`basePriority` stores the original value set at task creation. `priority` is the effective value that the aging sweeper updates. On recurrence reset, `priority` resets to `basePriority`.

**Why not a single field:** Without `basePriority`, recurring tasks would inherit their aged priority into the next cycle, causing unbounded priority escalation across recurrence cycles.

### 4. Priority range 0–1000

Expand from the current 1–10 range. The wider range provides room for meaningful aging (a task aging 1 point/day has 1000 days of headroom) and finer-grained manual prioritization.

**Migration:** Existing tasks with priority 1–10 remain valid. No data migration needed — values are already within range.

### 5. Jitter via recurrenceJitter field

Per-task jitter range in seconds. On recurrence reset, a random value in `[0, recurrenceJitter]` is added to `scheduledAt`. This prevents thundering herd when many tasks share the same `recurrenceInterval`.

## Risks / Trade-offs

**[Risk] Aging sweeper at 3M rows** → The diff-only query (only update where priority < computed) ensures most ticks touch zero rows. At worst case (all tasks crossing boundary simultaneously), batch the update per-project with a LIMIT to cap write amplification.

**[Risk] Recurring task stuck in failure loop** → If a recurring task consistently fails and exhausts `maxAttempts`, it transitions to `failed` and stays there — recurrence only triggers on `done`, not `failed`. This is intentional: persistent failures should not silently retry forever. Manual intervention or a separate monitoring system should flag these.

**[Risk] Priority overflow on manual + aging** → `agingMaxPriority` caps the effective priority. Tasks created with `basePriority: 900` and `agingRate: 1` will cap at 1000 (or the project's configured ceiling).

**[Trade-off] No per-task aging rate** → Simplifies the model but means all tasks in a project age at the same rate. If needed later, adding `agingRate` to Task is additive and non-breaking.

## Migration Plan

1. Add Prisma schema fields with defaults (`basePriority` defaults to `priority`, `recurrenceInterval`/`recurrenceJitter` default to null, project aging fields default to null)
2. Generate and run migration
3. Backfill `basePriority = priority` for existing tasks (single UPDATE)
4. Deploy updated hub with recurrence logic and aging sweeper
5. Aging sweeper is no-op until `agingRate` is configured on a project

**Rollback:** Remove new fields from schema, revert code. No data loss — `basePriority` and aging fields are additive.
