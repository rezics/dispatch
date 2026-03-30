import { Elysia, t } from 'elysia'
import type { PrismaClient } from '@prisma/client'
import { createTask } from '../queue/create'

export const tasksRoutes = (db: PrismaClient) =>
  new Elysia({ prefix: '/tasks', tags: ['Tasks'] })
    .post(
      '',
      async ({ body, set }) => {
        const task = await createTask(db, body)
        set.status = 201
        return task
      },
      {
        body: t.Object({
          project: t.String(),
          type: t.String(),
          payload: t.Any(),
          priority: t.Optional(t.Integer({ minimum: 1, maximum: 10 })),
          maxAttempts: t.Optional(t.Integer({ minimum: 1 })),
          scheduledAt: t.Optional(t.String({ format: 'date-time' })),
        }),
        detail: {
          summary: 'Create a task',
          description: 'Submit a new task to the queue',
        },
      },
    )
    .get(
      '',
      async ({ query }) => {
        const where: Record<string, unknown> = {}
        if (query.project) where.project = query.project
        if (query.status) where.status = query.status
        if (query.type) where.type = query.type

        const tasks = await db.task.findMany({
          where,
          take: Math.min(query.limit ?? 50, 1000),
          skip: query.offset ?? 0,
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        })
        return tasks
      },
      {
        query: t.Object({
          project: t.Optional(t.String()),
          status: t.Optional(t.String()),
          type: t.Optional(t.String()),
          limit: t.Optional(t.Integer({ minimum: 1, maximum: 1000 })),
          offset: t.Optional(t.Integer({ minimum: 0 })),
        }),
        detail: {
          summary: 'List tasks',
          description: 'List tasks with optional filters',
        },
      },
    )
    .get(
      '/:id',
      async ({ params, set }) => {
        const task = await db.task.findUnique({ where: { id: params.id } })
        if (!task) {
          set.status = 404
          return { error: 'Task not found' }
        }
        return task
      },
      {
        params: t.Object({ id: t.String() }),
        detail: {
          summary: 'Get task by ID',
          description: 'Retrieve a single task by its ID',
        },
      },
    )
