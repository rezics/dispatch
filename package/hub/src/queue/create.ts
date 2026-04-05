import type { PrismaClient } from '#/prisma/client'

export interface CreateTaskInput {
  project: string
  type: string
  payload: unknown
  priority?: number
  maxAttempts?: number
  scheduledAt?: Date
}

export async function createTask(db: PrismaClient, input: CreateTaskInput) {
  return db.task.create({
    data: {
      project: input.project,
      type: input.type,
      payload: input.payload ?? {},
      priority: input.priority,
      maxAttempts: input.maxAttempts,
      scheduledAt: input.scheduledAt,
    },
  })
}
