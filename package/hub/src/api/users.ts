import { Elysia, t } from 'elysia'
import type { PrismaClient } from '#/prisma/client'
import { adminAuth } from '../auth/middleware'

export const userRoutes = (db: PrismaClient) =>
  new Elysia({ prefix: '/users', tags: ['Users'] })
    .use(adminAuth(db))
    .get(
      '/',
      async () => {
        return db.user.findMany({ orderBy: { createdAt: 'desc' } })
      },
      {
        detail: {
          summary: 'List users',
          security: [{ Bearer: [] }],
        },
      },
    )
    .post(
      '/',
      async ({ body, admin, set }) => {
        const existing = await db.user.findUnique({ where: { id: body.id } })
        if (existing) {
          set.status = 409
          return { error: 'User already exists' }
        }

        const user = await db.user.create({
          data: {
            id: body.id,
            isRoot: body.isRoot ?? false,
            createdBy: admin.userId,
          },
        })

        set.status = 201
        return user
      },
      {
        body: t.Object({
          id: t.String(),
          isRoot: t.Optional(t.Boolean()),
        }),
        detail: {
          summary: 'Create user',
          security: [{ Bearer: [] }],
        },
      },
    )
