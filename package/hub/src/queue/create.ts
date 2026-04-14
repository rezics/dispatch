import type { PrismaClient } from '#/prisma/client'

export interface CreateTaskInput {
  project: string
  type: string
  payload: unknown
  priority?: number
  maxAttempts?: number
  scheduledAt?: Date
  recurrenceInterval?: number
  recurrenceJitter?: number
}

export async function createTask(db: PrismaClient, input: CreateTaskInput) {
  const priority = input.priority ?? 5
  return db.task.create({
    data: {
      project: input.project,
      type: input.type,
      payload: input.payload ?? {},
      priority,
      basePriority: priority,
      maxAttempts: input.maxAttempts,
      scheduledAt: input.scheduledAt,
      recurrenceInterval: input.recurrenceInterval,
      recurrenceJitter: input.recurrenceJitter,
    },
  })
}
