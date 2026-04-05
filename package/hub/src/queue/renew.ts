import type { PrismaClient } from '#/prisma/client'
import { parseLeaseDuration } from './claim'

export async function renewLease(
  db: PrismaClient,
  taskIds: string[],
  workerId: string,
  extend: string,
) {
  const seconds = parseLeaseDuration(extend)

  const expired = await db.task.findMany({
    where: {
      id: { in: taskIds },
      workerId,
      status: 'running',
      leaseExpiresAt: { lt: new Date() },
    },
    select: { id: true },
  })

  if (expired.length > 0) {
    throw new Error('LEASE_EXPIRED')
  }

  await db.task.updateMany({
    where: {
      id: { in: taskIds },
      workerId,
      status: 'running',
    },
    data: {
      leaseExpiresAt: new Date(Date.now() + seconds * 1000),
    },
  })
}
