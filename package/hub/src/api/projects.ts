import { Elysia, t } from 'elysia'
import type { PrismaClient } from '#/prisma/client'
import { adminAuth } from '../auth/middleware'

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
    .get(
      '/:id',
      async ({ params, set }) => {
        const project = await db.project.findUnique({ where: { id: params.id } })
        if (!project) {
          set.status = 404
          return { error: 'Project not found' }
        }
        return project
      },
      {
        params: t.Object({ id: t.String() }),
        detail: {
          summary: 'Get project',
          description: 'Retrieve a project by ID',
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
    // Admin-only mutation routes
    .use(adminAuth(db))
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
          verification: t.Optional(t.String()),
          receiptSecret: t.Optional(t.String()),
          jwksUri: t.Optional(t.String()),
          maxTaskHoldTime: t.Optional(t.Nullable(t.Integer({ minimum: 1 }))),
          allowedTypes: t.Optional(t.Array(t.String())),
        }),
        detail: {
          summary: 'Create project',
          description: 'Register a new project (admin only)',
          security: [{ Bearer: [] }],
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
          verification: t.Optional(t.String()),
          receiptSecret: t.Optional(t.String()),
          jwksUri: t.Optional(t.String()),
          maxTaskHoldTime: t.Optional(t.Nullable(t.Integer({ minimum: 1 }))),
          allowedTypes: t.Optional(t.Array(t.String())),
        }),
        detail: {
          summary: 'Update project',
          description: 'Update project settings (admin only)',
          security: [{ Bearer: [] }],
        },
      },
    )
    .delete(
      '/:id',
      async ({ params, set }) => {
        const project = await db.project.findUnique({ where: { id: params.id } })
        if (!project) {
          set.status = 404
          return { error: 'Project not found' }
        }

        const taskCount = await db.task.count({ where: { project: params.id } })
        if (taskCount > 0) {
          set.status = 409
          return { error: 'Project has tasks', taskCount }
        }

        try {
          await db.project.delete({ where: { id: params.id } })
          return { id: params.id, deleted: true }
        } catch {
          set.status = 404
          return { error: 'Project not found' }
        }
      },
      {
        params: t.Object({ id: t.String() }),
        detail: {
          summary: 'Delete project',
          description:
            'Delete a project. Returns 409 with task count when the project still has tasks.',
          security: [{ Bearer: [] }],
        },
      },
    )
    .delete(
      '/:id/tasks',
      async ({ params, body, set }) => {
        const project = await db.project.findUnique({ where: { id: params.id } })
        if (!project) {
          set.status = 404
          return { error: 'Project not found' }
        }

        if (body.confirm !== params.id) {
          set.status = 400
          return { error: 'Confirmation does not match project id' }
        }

        const result = await db.task.deleteMany({ where: { project: params.id } })
        return { deleted: result.count }
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({ confirm: t.String() }),
        detail: {
          summary: 'Clear all tasks for a project',
          description:
            "Delete every task associated with the project (any status). Body 'confirm' must equal the project id.",
          security: [{ Bearer: [] }],
        },
      },
    )
