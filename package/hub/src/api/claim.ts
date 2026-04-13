import { Elysia, t } from 'elysia'
import type { PrismaClient } from '#/prisma/client'
import { claimTasks } from '../queue/claim'
import { renewLease } from '../queue/renew'
import { completeTasks } from '../queue/complete'
import { workerAuth, requireProjectAccess } from '../auth/middleware'
import type { AuthProvider } from '../auth/jwt'
import { enforceReceipt } from '../notary/trust'
import { ReceiptError } from '../notary/receipt'
import type { ResultPluginRunner } from '../plugin/runner'

// Re-export for convenience
export { type AuthProvider } from '../auth/jwt'

export const heartbeatRoutes = (db: PrismaClient, authProviders: AuthProvider[]) =>
  new Elysia({ prefix: '/workers', tags: ['Workers'] })
    .use(workerAuth(authProviders, db))
    .post(
      '/heartbeat',
      async ({ body, worker, set }) => {
        try {
          const result: { count: bigint }[] = await db.$queryRaw`
            UPDATE "Task"
            SET "leaseExpiresAt" = NOW() + INTERVAL '180 seconds'
            WHERE "workerId" = ${body.workerId}
              AND "status" = 'running'
            RETURNING 1
          `
          return { extended: result.length }
        } catch (err) {
          set.status = 400
          return { error: (err as Error).message }
        }
      },
      {
        body: t.Object({
          workerId: t.String(),
        }),
        detail: {
          summary: 'Worker heartbeat',
          description: 'Extend leases for all tasks held by a worker',
          security: [{ Bearer: [] }],
        },
      },
    )

export const claimRoutes = (db: PrismaClient, authProviders: AuthProvider[], resultPluginRunner?: ResultPluginRunner) =>
  new Elysia({ prefix: '/tasks', tags: ['Tasks'] })
    .use(workerAuth(authProviders, db))
    .post(
      '/claim',
      async ({ body, worker, set }) => {
        try {
          const project = body.project
          requireProjectAccess(worker, project)
          const tasks = await claimTasks(
            db,
            worker.sub,
            project,
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
          project: t.String(),
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
      async ({ body, worker, set }) => {
        try {
          await renewLease(db, body.taskIds, worker.sub, body.extend)
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
      async ({ body, worker, set }) => {
        try {
          const doneItems = body.done ?? []
          const failedItems = body.failed ?? []

          // If there are done items, check trust level and enforce receipt
          if (doneItems.length > 0) {
            const taskIds = [...doneItems.map((d) => d.id), ...failedItems.map((f) => f.id)]

            // Get the project from the first task to look up verification mode
            const firstTask = await db.task.findFirst({
              where: { id: { in: taskIds } },
              select: { project: true },
            })

            if (firstTask) {
              requireProjectAccess(worker, firstTask.project)

              const project = await db.project.findUnique({
                where: { id: firstTask.project },
              })

              if (project) {
                await enforceReceipt(
                  db,
                  project,
                  body.receipt as any,
                  doneItems.map((d) => d.id),
                  worker.sub,
                )
              }
            }
          }

          await completeTasks(db, doneItems, failedItems)

          // Route done tasks through result plugin runner
          if (resultPluginRunner) {
            for (const item of doneItems) {
              const task = await db.task.findUnique({
                where: { id: item.id },
                select: { id: true, project: true, type: true },
              })
              if (task) {
                try {
                  await resultPluginRunner.run(task, item.result as any)
                } catch (err) {
                  // Result plugin failure does not block completion
                  console.error(`[result-plugin] Error for task ${item.id}:`, err)
                }
              }
            }
          }

          return { ok: true }
        } catch (err) {
          if (err instanceof ReceiptError) {
            set.status = err.status
            return { error: err.message }
          }
          if (err && typeof err === 'object' && 'status' in err && (err as any).status === 409) {
            set.status = 409
            return { error: (err as any).message }
          }
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
          receipt: t.Optional(
            t.Object({
              taskIds: t.Array(t.String()),
              workerId: t.String(),
              project: t.String(),
              issuedAt: t.Number(),
              expiresAt: t.Number(),
              nonce: t.String(),
              signature: t.String(),
            }),
          ),
        }),
        detail: {
          summary: 'Complete tasks',
          description: 'Submit task completion results (done and/or failed). For receipted projects, include a signed CompletionReceipt.',
          security: [{ Bearer: [] }],
        },
      },
    )
