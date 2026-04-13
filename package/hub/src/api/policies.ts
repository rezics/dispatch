import { Elysia, t } from 'elysia'
import type { PrismaClient } from '#/prisma/client'
import { adminAuth } from '../auth/middleware'
import { invalidatePolicyCache } from '../auth/resolve'

export const policyRoutes = (db: PrismaClient) =>
  new Elysia({ prefix: '/policies', tags: ['Policies'] })
    .use(adminAuth(db))
    .get(
      '/',
      async () => {
        return db.accessPolicy.findMany({ orderBy: { createdAt: 'desc' } })
      },
      {
        detail: {
          summary: 'List access policies',
          security: [{ Bearer: [] }],
        },
      },
    )
    .post(
      '/',
      async ({ body, admin, set }) => {
        const policy = await db.accessPolicy.create({
          data: {
            issPattern: body.issPattern,
            claimField: body.claimField,
            claimPattern: body.claimPattern,
            projectScope: body.projectScope ?? null,
            createdBy: admin.userId,
          },
        })

        invalidatePolicyCache()
        set.status = 201
        return policy
      },
      {
        body: t.Object({
          issPattern: t.String(),
          claimField: t.String(),
          claimPattern: t.String(),
          projectScope: t.Optional(t.String()),
        }),
        detail: {
          summary: 'Create access policy',
          security: [{ Bearer: [] }],
        },
      },
    )
    .patch(
      '/:id',
      async ({ params, body, set }) => {
        const existing = await db.accessPolicy.findUnique({ where: { id: params.id } })
        if (!existing) {
          set.status = 404
          return { error: 'Policy not found' }
        }

        const policy = await db.accessPolicy.update({
          where: { id: params.id },
          data: {
            ...(body.issPattern !== undefined && { issPattern: body.issPattern }),
            ...(body.claimField !== undefined && { claimField: body.claimField }),
            ...(body.claimPattern !== undefined && { claimPattern: body.claimPattern }),
            ...(body.projectScope !== undefined && { projectScope: body.projectScope }),
          },
        })

        invalidatePolicyCache()
        return policy
      },
      {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          issPattern: t.Optional(t.String()),
          claimField: t.Optional(t.String()),
          claimPattern: t.Optional(t.String()),
          projectScope: t.Optional(t.Nullable(t.String())),
        }),
        detail: {
          summary: 'Update access policy',
          security: [{ Bearer: [] }],
        },
      },
    )
    .delete(
      '/:id',
      async ({ params, set }) => {
        const existing = await db.accessPolicy.findUnique({ where: { id: params.id } })
        if (!existing) {
          set.status = 404
          return { error: 'Policy not found' }
        }

        await db.accessPolicy.delete({ where: { id: params.id } })
        invalidatePolicyCache()
        return { ok: true }
      },
      {
        params: t.Object({ id: t.String() }),
        detail: {
          summary: 'Delete access policy',
          security: [{ Bearer: [] }],
        },
      },
    )
