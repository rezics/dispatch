import { Elysia, t } from 'elysia'
import type { PrismaClient } from '#/prisma/client'
import type { WorkerMessage } from '@rezics/dispatch-type'
import { verifyWorkerToken } from '../auth/jwt'
import type { WorkerIdentity } from '../auth/middleware'
import { WsManager } from './manager'

export const wsRoute = (db: PrismaClient, wsManager: WsManager) =>
  new Elysia({ tags: ['Workers'] }).ws('/workers', {
    async open(ws) {
      const token = ws.data.query?.token as string | undefined
      if (!token) {
        ws.close(4001, 'Missing auth token')
        return
      }

      // Store the token; verification happens at register time when the
      // target project (and its jwksUri) is known.
      ;(ws as any)._token = token
    },

    async message(ws, data) {
      const identity = (ws as any)._identity as WorkerIdentity | undefined
      const token = (ws as any)._token as string | undefined
      const msg = data as unknown as WorkerMessage

      if (msg.type === 'register') {
        if (!token) {
          ws.close(4001, 'Not authenticated')
          return
        }

        const projectId = (msg as any).project as string
        const project = await db.project.findUnique({
          where: { id: projectId },
          select: { id: true, jwksUri: true },
        })

        if (!project || !project.jwksUri) {
          ws.close(4003, `Invalid project or missing JWKS: ${projectId}`)
          return
        }

        let sub: string
        try {
          const claims = (await verifyWorkerToken(token, project.jwksUri)) as unknown as Record<
            string,
            unknown
          >
          if (typeof claims.sub !== 'string') {
            ws.close(4001, 'Invalid auth token')
            return
          }
          sub = claims.sub
        } catch {
          ws.close(4001, 'Invalid auth token')
          return
        }

        const workerIdentity: WorkerIdentity = { sub, project: project.id }
        ;(ws as any)._identity = workerIdentity
        ;(ws as any)._workerId = sub

        await wsManager.register(
          sub,
          project.id,
          { send: (d: string) => ws.send(d), close: () => ws.close() },
          msg.capabilities,
          msg.concurrency,
        )
        return
      }

      if (!identity) {
        ws.close(4001, 'Not authenticated')
        return
      }

      await wsManager.handleMessage(identity.sub, msg)
    },

    async close(ws) {
      const workerId = (ws as any)._workerId as string | undefined
      if (workerId) {
        await wsManager.disconnect(workerId)
      }
    },

    body: t.Any(),
    query: t.Object({
      token: t.Optional(t.String()),
    }),
    detail: {
      summary: 'Worker WebSocket endpoint',
      description:
        'WebSocket endpoint for real-time worker communication. Pass JWT as ?token query parameter. Worker auth completes on the first `register` message — the project identifies which JWKS to verify the token against.',
      tags: ['Workers'],
    },
  })
