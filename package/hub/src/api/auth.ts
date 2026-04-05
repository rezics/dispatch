import { Elysia, t } from 'elysia'
import { bearer } from '@elysiajs/bearer'
import type { PrismaClient } from '#/prisma/client'
import { verifyWorkerToken, type AuthProvider } from '../auth/jwt'

const SESSION_COOKIE = 'dispatch_session'
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function createSession(db: PrismaClient, userId: string, isProduction: boolean, set: any) {
  const sessionToken = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.session.create({
    data: {
      token: sessionToken,
      userId,
      expiresAt,
    },
  })

  const securePart = isProduction ? '; Secure' : ''
  set.headers['set-cookie'] =
    `${SESSION_COOKIE}=${sessionToken}; HttpOnly; SameSite=Strict; Path=/${securePart}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`

  return { token: sessionToken, expiresAt: expiresAt.toISOString() }
}

export const authRoutes = (db: PrismaClient, isProduction: boolean, authProviders: AuthProvider[]) =>
  new Elysia({ prefix: '/auth', tags: ['Auth'] })
    .use(bearer())
    .post(
      '/login',
      async ({ bearer: token, body, set }) => {
        // Bearer token present → JWT path
        if (token) {
          let claims
          try {
            claims = await verifyWorkerToken(token, authProviders)
          } catch (err) {
            set.status = 401
            const message =
              err instanceof Error && err.message.includes('expired')
                ? 'Token expired'
                : 'Invalid token'
            return { error: message }
          }

          const sub = claims.sub as string
          const user = await db.user.findUnique({ where: { id: sub } })

          if (!user || !user.isRoot) {
            set.status = 403
            return { error: 'Dashboard login requires root' }
          }

          return createSession(db, user.id, isProduction, set)
        }

        // No Bearer token → password path
        const { username, password } = body ?? {}

        if (!username || !password) {
          set.status = 401
          return { error: 'Missing credentials' }
        }

        const user = await db.user.findUnique({ where: { id: username } })

        if (!user || !user.passwordHash) {
          set.status = 401
          return { error: 'Invalid credentials' }
        }

        if (!user.isRoot) {
          set.status = 403
          return { error: 'Dashboard login requires root' }
        }

        const valid = await Bun.password.verify(password, user.passwordHash)
        if (!valid) {
          set.status = 401
          return { error: 'Invalid credentials' }
        }

        return createSession(db, user.id, isProduction, set)
      },
      {
        body: t.Optional(
          t.Object({
            username: t.String(),
            password: t.String(),
          }),
        ),
        detail: {
          summary: 'Login',
          description:
            'Authenticate via Bearer JWT or username/password to create a dashboard session.',
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

        return {
          sub: session.user.id,
          isRoot: session.user.isRoot,
          permissions: session.user.isRoot ? ['*'] : [],
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
