import { Elysia } from 'elysia'
import { bearer } from '@elysiajs/bearer'
import type { PrismaClient } from '#/prisma/client'
import { verifyWorkerToken } from './jwt'

export interface WorkerIdentity {
  sub: string
  project: string
}

export interface AdminSession {
  userId: string
  isRoot: boolean
}

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
 * Worker auth middleware — reads Bearer JWT, extracts target project from
 * the request body, and verifies the JWT against that project's `jwksUri`.
 * Produces `worker: WorkerIdentity` in context.
 */
export const workerAuth = (db: PrismaClient) =>
  new Elysia({ name: 'workerAuth' })
    .use(bearer())
    .derive({ as: 'scoped' }, async ({ bearer: token, body }) => {
      if (!token) {
        throw authError('Missing authorization token', 401)
      }

      const projectId = (body as { project?: unknown } | undefined)?.project
      if (typeof projectId !== 'string' || projectId.length === 0) {
        throw authError('Missing project in request', 401)
      }

      const project = await db.project.findUnique({
        where: { id: projectId },
        select: { id: true, jwksUri: true },
      })

      if (!project || !project.jwksUri) {
        throw authError('Invalid project or missing JWKS', 401)
      }

      let claims: Record<string, unknown>
      try {
        claims = (await verifyWorkerToken(token, project.jwksUri)) as unknown as Record<
          string,
          unknown
        >
      } catch (err) {
        const message =
          err instanceof Error && err.message.includes('expired')
            ? 'Token expired'
            : 'Invalid token'
        throw authError(message, 401)
      }

      const sub = typeof claims.sub === 'string' ? claims.sub : null
      if (!sub) {
        throw authError('Invalid token: missing sub', 401)
      }

      const worker: WorkerIdentity = { sub, project: project.id }
      return { worker }
    })

/**
 * Check that a worker has access to a specific project. Throws 403 if not.
 */
export function requireProjectAccess(identity: WorkerIdentity, projectId: string): void {
  if (identity.project === projectId) return
  throw authError(`No access to project: ${projectId}`, 403)
}
