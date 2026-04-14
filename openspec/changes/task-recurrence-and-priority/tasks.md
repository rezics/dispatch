## 1. Schema & Migration

- [x] 1.1 Add `basePriority Int @default(5)`, `recurrenceInterval Int?`, `recurrenceJitter Int?` to Task model in Prisma schema
- [x] 1.2 Add `agingRate Float?`, `agingMaxPriority Int? @default(1000)` to Project model in Prisma schema
- [x] 1.3 Generate and run Prisma migration
- [x] 1.4 Add backfill step: `UPDATE "Task" SET "basePriority" = "priority"` for existing rows

## 2. Type Definitions

- [x] 2.1 Update `Task` interface in `package/type/src/task.ts` — add `basePriority`, `recurrenceInterval`, `recurrenceJitter` fields; document priority range as 0–1000

## 3. Recurrence Logic

- [x] 3.1 Update `completeTasks()` in `package/hub/src/queue/complete.ts` — after result plugin runs, check `recurrenceInterval`; if set, reset task to pending with computed `scheduledAt` (interval + jitter), `priority = basePriority`, `attempts = 0`, clear worker/lease fields
- [x] 3.2 Ensure `finishedAt` is set before the recurrence reset so it records last completion time

## 4. Aging Sweeper

- [x] 4.1 Create `package/hub/src/reaper/aging.ts` with `agePriorities(db)` function — diff-only UPDATE query that computes effective priority per project's `agingRate`/`agingMaxPriority` and only updates rows where stored priority < computed
- [x] 4.2 Add `startAgingSweeper(db, interval)` function returning a cleanup handle, similar to `startReaper()`
- [x] 4.3 Wire `startAgingSweeper()` into hub startup alongside the existing reaper, with configurable interval (default 300s)

## 5. API Updates

- [x] 5.1 Update task creation endpoint to accept `basePriority`, `recurrenceInterval`, `recurrenceJitter`; ensure `priority` is initialized to `basePriority` on create
- [x] 5.2 Update Prismabox generated types (re-run generator after schema change)

## 6. Tests

- [x] 6.1 Test recurring task completion: verify reset to pending with correct `scheduledAt`, `priority = basePriority`, `attempts = 0`
- [x] 6.2 Test recurring task with jitter: verify `scheduledAt` offset is within `[interval, interval + jitter]`
- [x] 6.3 Test recurring task failure: verify failed recurring task stays failed (no auto-reset)
- [x] 6.4 Test aging sweeper: verify priority increases for stale tasks, respects ceiling, skips projects with null `agingRate`, skips running tasks
- [x] 6.5 Test aging sweeper no-op: verify zero updates when priorities are already current
