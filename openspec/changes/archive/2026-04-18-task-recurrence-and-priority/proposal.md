## Why

The system will migrate 3M+ records (books, novels, games) from a legacy system, many of which need periodic re-processing (e.g., metadata refresh). The current task model is one-shot — completed tasks stay done. At scale, flat priority with no aging means low-priority tasks can starve indefinitely. We need recurring tasks, a wider priority range, and priority aging to handle this workload.

## What Changes

- **Recurring tasks**: Tasks with a `recurrenceInterval` automatically reset to `pending` on completion, with `scheduledAt` pushed forward by the interval plus optional jitter. `finishedAt` records the last completion time.
- **Priority range 0–1000**: **BREAKING** — Expand the priority range from 1–10 to 0–1000. Existing tasks with priority 1–10 remain valid but the documented range changes.
- **Base priority tracking**: New `basePriority` field stores the original priority. `priority` becomes the effective (aged) value. On recurrence reset, `priority` resets to `basePriority`.
- **Project-level priority aging**: New `agingRate` (points/day) and `agingMaxPriority` (ceiling, default 1000) fields on Project. A separate aging sweeper periodically bumps `priority` for stale pending tasks.
- **Aging sweeper**: A new background loop (separate from the reaper) that runs on a slower cadence (~5 min) and only updates tasks whose computed priority has crossed an integer boundary, minimizing write overhead at scale.

## Capabilities

### New Capabilities
- `task-recurrence`: Recurring task lifecycle — auto-reset on completion with configurable interval and jitter
- `priority-aging`: Project-level priority aging — sweeper that gradually increases effective priority of stale pending tasks

### Modified Capabilities
- `shared-types`: Task interface gains `basePriority`, `recurrenceInterval`, `recurrenceJitter`; priority range changes from 1–10 to 0–1000
- `hub-queue`: Completion flow branches on `recurrenceInterval` to reset recurring tasks instead of marking done
- `hub-reaper`: Reaper module gains a separate aging sweeper loop on a slower cadence

## Impact

- **Schema**: Prisma migration adding `basePriority`, `recurrenceInterval`, `recurrenceJitter` to Task; `agingRate`, `agingMaxPriority` to Project
- **API**: Task creation endpoint accepts new fields; task responses include new fields
- **Queue**: `complete.ts` gains recurrence reset logic
- **Reaper**: New aging sweeper function and timer alongside existing reaper loop
- **Types**: `@rezics/dispatch-type` Task interface updated
- **Index**: Existing composite index on Task already covers `(project, status, priority DESC, scheduledAt ASC)` — no index changes needed
