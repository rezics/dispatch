-- Partial index for dispatch: pending tasks ordered by priority/scheduledAt
CREATE INDEX "Task_dispatch_idx" ON "Task" ("project", "priority" DESC, "scheduledAt" ASC)
  WHERE "status" = 'pending';

-- Partial index for reaper: running tasks with expired leases
CREATE INDEX "Task_reaper_idx" ON "Task" ("leaseExpiresAt")
  WHERE "status" = 'running';
