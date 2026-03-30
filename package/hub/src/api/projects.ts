import { Elysia, t } from 'elysia'
import type { PrismaClient } from '@prisma/client'

export const projectsRoutes = (db: PrismaClient) =>
  new Elysia({ prefix: '/projects', tags: ['Projects'] })
    .get(
      '',
      async () => {
        return db.project.findMany({ orderBy: { createdAt: 'desc' } })
      },
      {
        detail: {
          summary: 'List projects',
          description: 'List all projects',
        },
      },
    )
    .post(
      '',
      async ({ body, set }) => {
        const project = await db.project.create({ data: body })
        set.status = 201
        return project
      },
      {
        body: t.Object({
          id: t.String(),
          trustLevel: t.Optional(t.String()),
          receiptSecret: t.Optional(t.String()),
          jwksUri: t.Optional(t.String()),
        }),
        detail: {
          summary: 'Create project',
          description: 'Register a new project',
        },
      },
    )
    .patch(
      '/:id',
      async ({ params, body, set }) => {
        try {
          const project = await db.project.update({
            where: { id: params.id },
            data: body,
          })
          return project
        } catch {
          set.status = 404
          return { error: 'Project not found' }
        }
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          trustLevel: t.Optional(t.String()),
          receiptSecret: t.Optional(t.String()),
          jwksUri: t.Optional(t.String()),
        }),
        detail: {
          summary: 'Update project',
          description: 'Update project settings',
        },
      },
    )
    .get(
      '/:id/stats',
      async ({ params, set }) => {
        const project = await db.project.findUnique({ where: { id: params.id } })
        if (!project) {
          set.status = 404
          return { error: 'Project not found' }
        }

        const [pending, running, done, failed] = await Promise.all([
          db.task.count({ where: { project: params.id, status: 'pending' } }),
          db.task.count({ where: { project: params.id, status: 'running' } }),
          db.task.count({ where: { project: params.id, status: 'done' } }),
          db.task.count({ where: { project: params.id, status: 'failed' } }),
        ])

        return { pending, running, done, failed }
      },
      {
        params: t.Object({ id: t.String() }),
        detail: {
          summary: 'Get project stats',
          description: 'Get task count breakdown by status for a project',
        },
      },
    )
