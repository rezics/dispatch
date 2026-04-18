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
  type?: string,
) {
  if (count > MAX_CLAIM_COUNT) {
    throw new Error(`Claim count ${count} exceeds maximum of ${MAX_CLAIM_COUNT}`)
  }

  const leaseSeconds = parseLeaseDuration(lease)

  // Look up project's maxTaskHoldTime
  const proj = await db.project.findUnique({
    where: { id: project },
    select: { maxTaskHoldTime: true },
  })

  const holdTimeExpr = proj?.maxTaskHoldTime
    ? `NOW() + INTERVAL '${proj.maxTaskHoldTime} seconds'`
    : 'NULL'

  const typeFilter = type ? `AND "type" = $5` : ''
  const params: unknown[] = [
    workerId,
    `${leaseSeconds} seconds`,
    project,
    count,
  ]
  if (type) params.push(type)

  const tasks: { id: string }[] = await db.$queryRawUnsafe(
    `UPDATE "Task"
    SET
      "status" = 'running',
      "workerId" = $1,
      "startedAt" = NOW(),
      "leaseExpiresAt" = NOW() + $2::interval,
      "maxHoldExpiresAt" = ${holdTimeExpr},
      "attempts" = "attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "Task"
      WHERE "project" = $3
        AND "status" = 'pending'
        AND "scheduledAt" <= NOW()
        ${typeFilter}
      ORDER BY "priority" DESC, "scheduledAt" ASC
      LIMIT $4
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`,
    ...params,
  )

  if (tasks.length === 0) return []

  const taskIds = tasks.map((t) => t.id)
  return db.task.findMany({
    where: { id: { in: taskIds } },
    orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }],
  })
}
