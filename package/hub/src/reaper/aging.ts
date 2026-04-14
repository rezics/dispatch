import type { PrismaClient } from '#/prisma/client'
import { parseInterval } from './reaper'

/**
 * Diff-only priority aging: only updates tasks whose computed priority
 * has crossed an integer boundary since the last stored value.
 * Skips projects with null agingRate and running tasks.
 */
export async function agePriorities(db: PrismaClient) {
  await db.$executeRaw`
    UPDATE "Task" t
    SET "priority" = LEAST(
        p."agingMaxPriority",
        t."basePriority" + FLOOR(p."agingRate" * EXTRACT(EPOCH FROM (NOW() - t."scheduledAt")) / 86400)
      )::int
    FROM "Project" p
    WHERE t."project" = p."id"
      AND t."status" = 'pending'
      AND p."agingRate" IS NOT NULL
      AND t."priority" < LEAST(
        p."agingMaxPriority",
        t."basePriority" + FLOOR(p."agingRate" * EXTRACT(EPOCH FROM (NOW() - t."scheduledAt")) / 86400)
      )
  `
}

export function startAgingSweeper(db: PrismaClient, interval: string): () => void {
  const ms = parseInterval(interval)
  const timer = setInterval(() => agePriorities(db), ms)
  return () => clearInterval(timer)
}
