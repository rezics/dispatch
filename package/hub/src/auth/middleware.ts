import { Elysia } from 'elysia'
import { bearer } from '@elysiajs/bearer'
import type { PrismaClient } from '#/prisma/client'
import { verifyWorkerToken, type AuthProvider } from './jwt'
import { resolveWorkerAccess, type WorkerIdentity, type AdminSession } from './resolve'

export type { AuthProvider } from './jwt'
export type { WorkerIdentity, AdminSession } from './resolve'

const SESSION_COOKIE = 'dispatch_session'

function authError(message: string, status: 401 | 403): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Admin auth middleware — reads session cookie, verifies root user.
 * Produces `admin: AdminSession` in context.
 */
export const adminAuth = (db: PrismaClient) =>
  new Elysia({ name: 'adminAuth' }).derive({ as: 'scoped' }, async ({ request }) => {
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      throw authError('Missing session', 401)
    }

    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
    if (!match) {
      throw authError('Missing session', 401)
    }

    const sessionToken = match[1]
    const session = await db.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    })

    if (!session || session.expiresAt <= new Date()) {
      throw authError('Session expired', 401)
    }

    if (!session.user.isRoot) {
      throw authError('Admin access required', 403)
    }

    const admin: AdminSession = {
      userId: session.user.id,
      isRoot: session.user.isRoot,
    }
    return { admin }
  })

/**
 * Worker auth middleware — reads Bearer JWT, verifies via providers,
 * resolves project access. Produces `worker: WorkerIdentity` in context.
 */
export const workerAuth = (providers: AuthProvider[], db: PrismaClient) =>
  new Elysia({ name: 'workerAuth' })
    .use(bearer())
    .derive({ as: 'scoped' }, async ({ bearer: token }) => {
      if (!token) {
        throw authError('Missing authorization token', 401)
      }

      let claims: Record<string, unknown>
      try {
        claims = (await verifyWorkerToken(token, providers)) as unknown as Record<string, unknown>
      } catch (err) {
        const message =
          err instanceof Error && err.message.includes('expired')
            ? 'Token expired'
            : 'Invalid token'
        throw authError(message, 401)
      }

      const worker = await resolveWorkerAccess(claims, db)

      if (worker.projects !== '*' && worker.projects.length === 0) {
        throw authError('No project access', 403)
      }

      return { worker }
    })

/**
 * Check that a worker has access to a specific project. Throws 403 if not.
 */
export function requireProjectAccess(identity: WorkerIdentity, projectId: string): void {
  if (identity.projects === '*') return
  if (identity.projects.includes(projectId)) return
  throw authError(`No access to project: ${projectId}`, 403)
}
