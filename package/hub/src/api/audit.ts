import { Elysia, t } from 'elysia'
import type { PrismaClient } from '#/prisma/client'
import { verifyReceipt, ReceiptError } from '../notary/receipt'

export const auditRoutes = (db: PrismaClient) =>
  new Elysia({ prefix: '/tasks', tags: ['Tasks'] }).post(
    '/audit',
    async ({ body, set }) => {
      try {
        // Look up the project
        const project = await db.project.findUnique({ where: { id: body.project } })
        if (!project) {
          set.status = 404
          return { error: 'Project not found' }
        }

        if (project.verification !== 'audited') {
          set.status = 400
          return { error: 'POST /tasks/audit is only for audited verification projects' }
        }

        if (!project.receiptSecret) {
          set.status = 500
          return { error: 'Project has no receipt secret configured' }
        }

        // Verify signature: the Main Server signs { taskIds, project } with the shared secret
        const payload = JSON.stringify({
          taskIds: body.taskIds.slice().sort(),
          project: body.project,
        })

        const key = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(project.receiptSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign', 'verify'],
        )

        const expectedBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
        const expectedSignature = Array.from(new Uint8Array(expectedBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

        if (body.signature !== expectedSignature) {
          set.status = 403
          return { error: 'Signature verification failed' }
        }

        // Mark all tasks as done
        await db.task.updateMany({
          where: { id: { in: body.taskIds }, project: body.project },
          data: {
            status: 'done',
            finishedAt: new Date(),
            workerId: null,
            leaseExpiresAt: null,
          },
        })

        return { ok: true, completed: body.taskIds.length }
      } catch (err) {
        if (err instanceof ReceiptError) {
          set.status = err.status
          return { error: err.message }
        }
        set.status = 500
        return { error: (err as Error).message }
      }
    },
    {
      body: t.Object({
        taskIds: t.Array(t.String()),
        project: t.String(),
        signature: t.String(),
      }),
      detail: {
        summary: 'Audit completion',
        description:
          'Mark tasks as done via Main Server audit. Only for projects with audited trust level. Signature is HMAC-SHA256 of sorted taskIds + project.',
        security: [{ Bearer: [] }],
        tags: ['Tasks'],
      },
    },
  )
