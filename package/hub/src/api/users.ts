import { Elysia, t } from 'elysia'
import type { PrismaClient } from '@prisma/client'
import { authMiddleware, requirePermission } from '../auth/middleware'
import type { AuthProvider } from '../auth/jwt'
import { PERMISSIONS } from '../auth/permissions'

export const userRoutes = (db: PrismaClient, authProviders: AuthProvider[]) =>
  new Elysia({ prefix: '/users', tags: ['Users'] })
    .use(authMiddleware(authProviders, db))
    .get(
      '/',
      async ({ identity }) => {
        requirePermission(identity, PERMISSIONS.ADMIN_USERS)
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
      async ({ body, identity, set }) => {
        requirePermission(identity, PERMISSIONS.ADMIN_USERS)
        // Creating a root user requires the caller to also be root
        if (body.isRoot && !identity.isRoot) {
          set.status = 403
          return { error: 'Only root users can create other root users' }
        }

        const existing = await db.user.findUnique({ where: { id: body.id } })
        if (existing) {
          set.status = 409
          return { error: 'User already exists' }
        }

        const user = await db.user.create({
          data: {
            id: body.id,
            isRoot: body.isRoot ?? false,
            createdBy: identity.sub,
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
