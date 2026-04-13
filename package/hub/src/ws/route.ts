import { Elysia, t } from 'elysia'
import type { PrismaClient } from '#/prisma/client'
import type { WorkerMessage } from '@rezics/dispatch-type'
import { verifyWorkerToken, type AuthProvider } from '../auth/jwt'
import { resolveWorkerAccess, type WorkerIdentity } from '../auth/resolve'
import { requireProjectAccess } from '../auth/middleware'
import { WsManager } from './manager'

export const wsRoute = (db: PrismaClient, authProviders: AuthProvider[], wsManager: WsManager) =>
  new Elysia({ tags: ['Workers'] }).ws('/workers', {
    async open(ws) {
      const token = ws.data.query?.token as string | undefined
      if (!token) {
        ws.close(4001, 'Missing auth token')
        return
      }

      try {
        const claims = (await verifyWorkerToken(token, authProviders)) as unknown as Record<
          string,
          unknown
        >
        const identity = await resolveWorkerAccess(claims, db)

        if (identity.projects !== '*' && identity.projects.length === 0) {
          ws.close(4003, 'No project access')
          return
        }

        ;(ws as any)._identity = identity
        ;(ws as any)._workerId = identity.sub
      } catch {
        ws.close(4001, 'Invalid auth token')
      }
    },

    async message(ws, data) {
      const workerId = (ws as any)._workerId as string | undefined
      const identity = (ws as any)._identity as WorkerIdentity | undefined
      if (!workerId || !identity) {
        ws.close(4001, 'Not authenticated')
        return
      }

      const msg = data as unknown as WorkerMessage

      if (msg.type === 'register') {
        const project = (msg as any).project as string
        try {
          requireProjectAccess(identity, project)
        } catch {
          ws.close(4003, `No access to project: ${project}`)
          return
        }

        await wsManager.register(
          workerId,
          project,
          { send: (d: string) => ws.send(d), close: () => ws.close() },
          msg.capabilities,
          msg.concurrency,
        )
        return
      }

      await wsManager.handleMessage(workerId, msg)
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
        'WebSocket endpoint for real-time worker communication. Pass JWT as ?token query parameter.',
      tags: ['Workers'],
    },
  })
