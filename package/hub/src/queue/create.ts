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

export class TaskTypeNotAllowedError extends Error {
  constructor(
    public readonly type: string,
    public readonly allowedTypes: string[],
  ) {
    super(
      `Task type "${type}" is not in project's allowedTypes [${allowedTypes.join(', ')}]`,
    )
    this.name = 'TaskTypeNotAllowedError'
  }
}

export async function createTask(db: PrismaClient, input: CreateTaskInput) {
  const project = await db.project.findUnique({
    where: { id: input.project },
    select: { allowedTypes: true },
  })

  if (project && project.allowedTypes.length > 0 && !project.allowedTypes.includes(input.type)) {
    throw new TaskTypeNotAllowedError(input.type, project.allowedTypes)
  }

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
