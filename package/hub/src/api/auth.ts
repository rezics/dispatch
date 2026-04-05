import { Elysia, t } from 'elysia'
import type { PrismaClient } from '@prisma/client'
import { verifyWorkerToken, type AuthProvider } from '../auth/jwt'
import { resolveIdentity } from '../auth/resolve'
import { hasAnyPermission } from '../auth/permissions'

const SESSION_COOKIE = 'dispatch_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const authRoutes = (db: PrismaClient, authProviders: AuthProvider[], isProduction: boolean) =>
  new Elysia({ prefix: '/auth', tags: ['Auth'] })
    .post(
      '/login',
      async ({ request, set }) => {
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

        if (!token) {
          set.status = 401
          return { error: 'Missing Bearer token' }
        }

        let claims: Record<string, unknown>
        try {
          claims = (await verifyWorkerToken(token, authProviders)) as unknown as Record<
            string,
            unknown
          >
        } catch {
          set.status = 401
          return { error: 'Invalid token' }
        }

        const identity = await resolveIdentity(claims, db)

        // Must have at least one dashboard permission
        const dashboardPerms = identity.permissions.filter((p) => p.startsWith('dashboard:'))
        if (!identity.isRoot && dashboardPerms.length === 0) {
          set.status = 403
          return { error: 'No dashboard permissions' }
        }

        // Ensure user exists in the User table (upsert for policy-based users)
        await db.user.upsert({
          where: { id: identity.sub },
          update: {},
          create: { id: identity.sub, isRoot: false },
        })

        const sessionToken = generateToken()
        const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

        await db.session.create({
          data: {
            token: sessionToken,
            userId: identity.sub,
            expiresAt,
          },
        })

        const securePart = isProduction ? '; Secure' : ''
        set.headers['set-cookie'] =
          `${SESSION_COOKIE}=${sessionToken}; HttpOnly; SameSite=Strict; Path=/${securePart}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`

        return { token: sessionToken, expiresAt: expiresAt.toISOString() }
      },
      {
        detail: {
          summary: 'Login',
          description: 'Verify a JWT and create a session for dashboard access.',
        },
      },
    )
    .get(
      '/me',
      async ({ request, set }) => {
        const cookieHeader = request.headers.get('cookie')
        const match = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))

        if (!match) {
          set.status = 401
          return { error: 'Not authenticated' }
        }

        const session = await db.session.findUnique({
          where: { token: match[1] },
          include: { user: true },
        })

        if (!session || session.expiresAt < new Date()) {
          set.status = 401
          return { error: 'Session expired' }
        }

        if (session.user.isRoot) {
          return { sub: session.user.id, isRoot: true, permissions: ['*'] }
        }

        const identity = await resolveIdentity({ sub: session.user.id }, db)
        return {
          sub: identity.sub,
          isRoot: identity.isRoot,
          permissions: identity.permissions,
        }
      },
      {
        detail: {
          summary: 'Current user',
          description: 'Get current authenticated user info from session cookie.',
        },
      },
    )
    .post(
      '/logout',
      async ({ request, set }) => {
        const cookieHeader = request.headers.get('cookie')
        const match = cookieHeader?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))

        if (match) {
          await db.session.deleteMany({ where: { token: match[1] } })
        }

        set.headers['set-cookie'] =
          `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`

        return { ok: true }
      },
      {
        detail: {
          summary: 'Logout',
          description: 'Delete the current session and clear the session cookie.',
        },
      },
    )
