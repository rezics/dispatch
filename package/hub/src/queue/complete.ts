import type { PrismaClient } from '#/prisma/client'

export interface DoneItem {
  id: string
  result: { strategy: string; data?: unknown; url?: string; headers?: Record<string, string>; plugin?: string }
}

export interface FailedItem {
  id: string
  error: string
  retryable: boolean
}

export async function completeTasks(
  db: PrismaClient,
  done: DoneItem[],
  failed: FailedItem[],
) {
  const ops: Promise<unknown>[] = []

  for (const item of done) {
    ops.push(
      db.task.update({
        where: { id: item.id },
        data: {
          status: 'done',
          finishedAt: new Date(),
          workerId: null,
          leaseExpiresAt: null,
        },
      }),
    )

    if (item.result.strategy === 'store') {
      ops.push(
        db.taskResult.upsert({
          where: { taskId: item.id },
          create: { taskId: item.id, data: item.result.data ?? {} },
          update: { data: item.result.data ?? {} },
        }),
      )
    }
  }

  for (const item of failed) {
    const task = await db.task.findUniqueOrThrow({ where: { id: item.id } })

    if (item.retryable && task.attempts < task.maxAttempts) {
      ops.push(
        db.task.update({
          where: { id: item.id },
          data: {
            status: 'pending',
            workerId: null,
            leaseExpiresAt: null,
            startedAt: null,
          },
        }),
      )
    } else {
      ops.push(
        db.task.update({
          where: { id: item.id },
          data: {
            status: 'failed',
            error: item.error,
            finishedAt: new Date(),
            workerId: null,
            leaseExpiresAt: null,
          },
        }),
      )
    }
  }

  await Promise.all(ops)
}

/**
 * Reset recurring done tasks back to pending with a new scheduledAt.
 * Call this AFTER result plugins have run so results are preserved.
 */
export async function resetRecurringTasks(
  db: PrismaClient,
  taskIds: string[],
) {
  if (taskIds.length === 0) return

  const tasks = await db.task.findMany({
    where: { id: { in: taskIds }, status: 'done', recurrenceInterval: { not: null } },
    select: { id: true, basePriority: true, recurrenceInterval: true, recurrenceJitter: true },
  })

  const ops: Promise<unknown>[] = []
  for (const task of tasks) {
    const interval = task.recurrenceInterval!
    const jitter = task.recurrenceJitter
      ? Math.floor(Math.random() * (task.recurrenceJitter + 1))
      : 0
    const scheduledAt = new Date(Date.now() + (interval + jitter) * 1000)

    ops.push(
      db.task.update({
        where: { id: task.id },
        data: {
          status: 'pending',
          priority: task.basePriority,
          scheduledAt,
          attempts: 0,
          workerId: null,
          leaseExpiresAt: null,
          maxHoldExpiresAt: null,
          startedAt: null,
        },
      }),
    )
  }

  await Promise.all(ops)
}
