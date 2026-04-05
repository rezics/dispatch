import { Elysia, t } from 'elysia'
import type { PrismaClient } from '@prisma/client'
import { authMiddleware, requirePermission } from '../auth/middleware'
import type { AuthProvider } from '../auth/jwt'
import { PERMISSIONS } from '../auth/permissions'
import { invalidatePolicyCache } from '../auth/resolve'

export const policyRoutes = (db: PrismaClient, authProviders: AuthProvider[]) =>
  new Elysia({ prefix: '/policies', tags: ['Policies'] })
    .use(authMiddleware(authProviders, db))
    .get(
      '/',
      async ({ identity }) => {
        requirePermission(identity, PERMISSIONS.ADMIN_POLICIES)
        return db.trustPolicy.findMany({ orderBy: { createdAt: 'desc' } })
      },
      {
        detail: {
          summary: 'List trust policies',
          security: [{ Bearer: [] }],
        },
      },
    )
    .post(
      '/',
      async ({ body, identity, set }) => {
        requirePermission(identity, PERMISSIONS.ADMIN_POLICIES)
        const policy = await db.trustPolicy.create({
          data: {
            issPattern: body.issPattern,
            claimField: body.claimField,
            claimPattern: body.claimPattern,
            permissions: body.permissions,
            projectScope: body.projectScope ?? null,
            createdBy: identity.sub,
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
          permissions: t.Array(t.String()),
          projectScope: t.Optional(t.String()),
        }),
        detail: {
          summary: 'Create trust policy',
          security: [{ Bearer: [] }],
        },
      },
    )
    .patch(
      '/:id',
      async ({ params, body, identity, set }) => {
        requirePermission(identity, PERMISSIONS.ADMIN_POLICIES)
        const existing = await db.trustPolicy.findUnique({ where: { id: params.id } })
        if (!existing) {
          set.status = 404
          return { error: 'Policy not found' }
        }

        const policy = await db.trustPolicy.update({
          where: { id: params.id },
          data: {
            ...(body.issPattern !== undefined && { issPattern: body.issPattern }),
            ...(body.claimField !== undefined && { claimField: body.claimField }),
            ...(body.claimPattern !== undefined && { claimPattern: body.claimPattern }),
            ...(body.permissions !== undefined && { permissions: body.permissions }),
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
          permissions: t.Optional(t.Array(t.String())),
          projectScope: t.Optional(t.Nullable(t.String())),
        }),
        detail: {
          summary: 'Update trust policy',
          security: [{ Bearer: [] }],
        },
      },
    )
    .delete(
      '/:id',
      async ({ params, identity, set }) => {
        requirePermission(identity, PERMISSIONS.ADMIN_POLICIES)
        const existing = await db.trustPolicy.findUnique({ where: { id: params.id } })
        if (!existing) {
          set.status = 404
          return { error: 'Policy not found' }
        }

        await db.trustPolicy.delete({ where: { id: params.id } })
        invalidatePolicyCache()
        return { ok: true }
      },
      {
        params: t.Object({ id: t.String() }),
        detail: {
          summary: 'Delete trust policy',
          security: [{ Bearer: [] }],
        },
      },
    )
