import type { PrismaClient } from '#/prisma/client'

export function parseInterval(interval: string): number {
  const match = interval.match(/^(\d+)s$/)
  if (!match) throw new Error('Invalid interval format. Use "<number>s" (e.g., "30s")')
  return Number.parseInt(match[1], 10) * 1000
}

export async function reap(db: PrismaClient) {
  const now = new Date()

  // Reset retryable expired tasks (lease expired or max hold time exceeded)
  await db.$executeRaw`
    UPDATE "Task"
    SET "status" = 'pending', "workerId" = NULL, "leaseExpiresAt" = NULL, "maxHoldExpiresAt" = NULL, "startedAt" = NULL
    WHERE "status" = 'running'
      AND "attempts" < "maxAttempts"
      AND (
        "leaseExpiresAt" < ${now}
        OR ("maxHoldExpiresAt" IS NOT NULL AND "maxHoldExpiresAt" < ${now})
      )
  `

  // Fail exhausted expired tasks (lease expired or max hold time exceeded)
  await db.$executeRaw`
    UPDATE "Task"
    SET "status" = 'failed', "finishedAt" = ${now}, "error" = 'Lease expired (max attempts exhausted)', "workerId" = NULL, "leaseExpiresAt" = NULL, "maxHoldExpiresAt" = NULL
    WHERE "status" = 'running'
      AND "attempts" >= "maxAttempts"
      AND (
        "leaseExpiresAt" < ${now}
        OR ("maxHoldExpiresAt" IS NOT NULL AND "maxHoldExpiresAt" < ${now})
      )
  `

  // Clean expired nonces
  await db.usedNonce.deleteMany({
    where: { expiresAt: { lt: now } },
  })

  // Clean expired sessions
  await db.session.deleteMany({
    where: { expiresAt: { lt: now } },
  })
}

export function startReaper(db: PrismaClient, interval: string): () => void {
  const ms = parseInterval(interval)
  const timer = setInterval(() => reap(db), ms)
  return () => clearInterval(timer)
}
