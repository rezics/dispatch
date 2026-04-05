import type { PrismaClient } from '#/prisma/client'

const MAX_LEASE_SECONDS = 3600
const MAX_CLAIM_COUNT = 5000

export function parseLeaseDuration(lease: string): number {
  const match = lease.match(/^(\d+)s$/)
  if (!match) throw new Error('Invalid lease format. Use "<number>s" (e.g., "500s")')
  const seconds = Number.parseInt(match[1], 10)
  if (seconds > MAX_LEASE_SECONDS) {
    throw new Error(`Lease duration ${seconds}s exceeds maximum of ${MAX_LEASE_SECONDS}s`)
  }
  return seconds
}

export async function claimTasks(
  db: PrismaClient,
  workerId: string,
  project: string,
  count: number,
  lease: string,
) {
  if (count > MAX_CLAIM_COUNT) {
    throw new Error(`Claim count ${count} exceeds maximum of ${MAX_CLAIM_COUNT}`)
  }

  const leaseSeconds = parseLeaseDuration(lease)

  const tasks: { id: string }[] = await db.$queryRaw`
    UPDATE "Task"
    SET
      "status" = 'running',
      "workerId" = ${workerId},
      "startedAt" = NOW(),
      "leaseExpiresAt" = NOW() + ${`${leaseSeconds} seconds`}::interval,
      "attempts" = "attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "Task"
      WHERE "project" = ${project}
        AND "status" = 'pending'
        AND "scheduledAt" <= NOW()
      ORDER BY "priority" DESC, "scheduledAt" ASC
      LIMIT ${count}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"
  `

  if (tasks.length === 0) return []

  const taskIds = tasks.map((t) => t.id)
  return db.task.findMany({
    where: { id: { in: taskIds } },
    orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }],
  })
}
