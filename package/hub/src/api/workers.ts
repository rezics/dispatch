import { Elysia, t } from 'elysia'
import type { PrismaClient } from '#/prisma/client'

export const workersRoutes = (db: PrismaClient) =>
  new Elysia({ prefix: '/workers', tags: ['Workers'] })
    .get(
      '',
      async () => {
        return db.worker.findMany({
          orderBy: { lastSeen: 'desc' },
        })
      },
      {
        detail: {
          summary: 'List workers',
          description: 'List all registered workers',
        },
      },
    )
    .get(
      '/:id',
      async ({ params, set }) => {
        const worker = await db.worker.findUnique({
          where: { id: params.id },
          include: { tasks: { where: { status: 'running' } } },
        })
        if (!worker) {
          set.status = 404
          return { error: 'Worker not found' }
        }
        return worker
      },
      {
        params: t.Object({ id: t.String() }),
        detail: {
          summary: 'Get worker by ID',
          description: 'Retrieve a worker and its active tasks',
        },
      },
    )
    .delete(
      '/:id',
      async ({ params, set }) => {
        try {
          await db.worker.delete({ where: { id: params.id } })
          return { ok: true }
        } catch {
          set.status = 404
          return { error: 'Worker not found' }
        }
      },
      {
        params: t.Object({ id: t.String() }),
        detail: {
          summary: 'Remove worker',
          description: 'Force disconnect a worker. Active tasks will be reclaimed by the reaper.',
        },
      },
    )
