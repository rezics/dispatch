import { Elysia } from 'elysia'
import { bearer } from '@elysiajs/bearer'
import type { PrismaClient } from '#/prisma/client'
import { verifyWorkerToken, type AuthProvider } from './jwt'
import { resolveIdentity } from './resolve'
import { hasPermission, type ResolvedIdentity } from './permissions'

export type { AuthProvider } from './jwt'

const SESSION_COOKIE = 'dispatch_session'

function authError(message: string, status: 401 | 403): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Core auth middleware — resolves Bearer JWT or session cookie into ResolvedIdentity.
 */
export const authMiddleware = (providers: AuthProvider[], db: PrismaClient) =>
  new Elysia({ name: 'auth' })
    .use(bearer())
    .derive({ as: 'scoped' }, async ({ bearer: token, request }) => {
      // 1. Try Bearer token (JWT)
      if (token) {
        try {
          const claims = await verifyWorkerToken(token, providers)
          const identity = await resolveIdentity(claims as unknown as Record<string, unknown>, db)
          return { identity }
        } catch (err) {
          const message =
            err instanceof Error && err.message.includes('expired')
              ? 'Token expired'
              : 'Invalid token'
          throw authError(message, 401)
        }
      }

      // 2. Try session cookie
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
        if (match) {
          const sessionToken = match[1]
          const session = await db.session.findUnique({
            where: { token: sessionToken },
            include: { user: true },
          })

          if (session && session.expiresAt > new Date()) {
            const identity: ResolvedIdentity = {
              sub: session.user.id,
              isRoot: session.user.isRoot,
              permissions: session.user.isRoot ? ['*'] : [],
              projects: session.user.isRoot ? '*' : [],
              claims: { sub: session.user.id },
            }
            return { identity }
          }
        }
      }

      // 3. No auth
      throw authError('Missing authorization token', 401)
    })

/**
 * Check permission and throw 403 if not authorized.
 * Call this at the start of route handlers that need specific permissions.
 */
export function requirePermission(identity: ResolvedIdentity, permission: string): void {
  if (!hasPermission(identity, permission)) {
    throw authError(`Missing permission: ${permission}`, 403)
  }
}
