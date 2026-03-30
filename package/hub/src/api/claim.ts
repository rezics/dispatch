import { Elysia, t } from 'elysia'
import type { PrismaClient } from '@prisma/client'
import { claimTasks } from '../queue/claim'
import { renewLease } from '../queue/renew'
import { completeTasks } from '../queue/complete'
import { authMiddleware, type AuthProvider } from '../auth/middleware'
import type { WorkerClaims } from '../auth/jwt'

// Re-export for convenience
export { type AuthProvider } from '../auth/middleware'

export const claimRoutes = (db: PrismaClient, authProviders: AuthProvider[]) =>
  new Elysia({ prefix: '/tasks', tags: ['Tasks'] })
    .use(authMiddleware(authProviders))
    .post(
      '/claim',
      async ({ body, workerClaims, set }) => {
        try {
          const tasks = await claimTasks(
            db,
            workerClaims.sub,
            workerClaims.project,
            body.count,
            body.lease,
          )
          return { tasks, count: tasks.length }
        } catch (err) {
          set.status = 400
          return { error: (err as Error).message }
        }
      },
      {
        body: t.Object({
          count: t.Integer({ minimum: 1, maximum: 5000 }),
          lease: t.String(),
        }),
        detail: {
          summary: 'Claim tasks',
          description: 'Claim a batch of pending tasks for processing',
          security: [{ Bearer: [] }],
        },
      },
    )
    .post(
      '/lease/renew',
      async ({ body, workerClaims, set }) => {
        try {
          await renewLease(db, body.taskIds, workerClaims.sub, body.extend)
          return { ok: true }
        } catch (err) {
          if ((err as Error).message === 'LEASE_EXPIRED') {
            set.status = 409
            return { error: 'Lease has expired' }
          }
          set.status = 400
          return { error: (err as Error).message }
        }
      },
      {
        body: t.Object({
          taskIds: t.Array(t.String()),
          extend: t.String(),
        }),
        detail: {
          summary: 'Renew lease',
          description: 'Extend the lease on claimed tasks',
          security: [{ Bearer: [] }],
        },
      },
    )
    .post(
      '/complete',
      async ({ body, set }) => {
        try {
          await completeTasks(db, body.done ?? [], body.failed ?? [])
          return { ok: true }
        } catch (err) {
          set.status = 400
          return { error: (err as Error).message }
        }
      },
      {
        body: t.Object({
          done: t.Optional(
            t.Array(
              t.Object({
                id: t.String(),
                result: t.Object({
                  strategy: t.String(),
                  data: t.Optional(t.Any()),
                  url: t.Optional(t.String()),
                  headers: t.Optional(t.Record(t.String(), t.String())),
                  plugin: t.Optional(t.String()),
                }),
              }),
            ),
          ),
          failed: t.Optional(
            t.Array(
              t.Object({
                id: t.String(),
                error: t.String(),
                retryable: t.Boolean(),
              }),
            ),
          ),
        }),
        detail: {
          summary: 'Complete tasks',
          description: 'Submit task completion results (done and/or failed)',
          security: [{ Bearer: [] }],
        },
      },
    )
