import { Elysia, t } from 'elysia'
import type { PrismaClient } from '@prisma/client'
import type { WorkerMessage } from '@rezics/dispatch-type'
import { verifyWorkerToken, type AuthProvider, type WorkerClaims } from '../auth/jwt'
import { WsManager } from './manager'

export const wsRoute = (db: PrismaClient, authProviders: AuthProvider[], wsManager: WsManager) =>
  new Elysia({ tags: ['Workers'] }).ws('/workers', {
    async open(ws) {
      // Auth is handled in the upgrade via headers
      const token = ws.data.query?.token as string | undefined
      if (!token) {
        ws.close(4001, 'Missing auth token')
        return
      }

      try {
        const claims = await verifyWorkerToken(token, authProviders)
        ;(ws as any)._claims = claims
        ;(ws as any)._workerId = claims.sub
      } catch {
        ws.close(4001, 'Invalid auth token')
      }
    },

    async message(ws, data) {
      const workerId = (ws as any)._workerId as string | undefined
      const claims = (ws as any)._claims as WorkerClaims | undefined
      if (!workerId || !claims) {
        ws.close(4001, 'Not authenticated')
        return
      }

      const msg = data as unknown as WorkerMessage

      if (msg.type === 'register') {
        await wsManager.register(
          workerId,
          claims.project,
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
