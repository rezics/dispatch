import { Elysia } from 'elysia'
import { bearer } from '@elysiajs/bearer'
import { verifyWorkerToken, type AuthProvider, type WorkerClaims } from './jwt'

export const authMiddleware = (providers: AuthProvider[]) =>
  new Elysia({ name: 'auth' })
    .use(bearer())
    .derive({ as: 'scoped' }, async ({ bearer: token }) => {
      if (!token) {
        throw new Response(JSON.stringify({ error: 'Missing authorization token' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      try {
        const workerClaims = await verifyWorkerToken(token, providers)
        return { workerClaims }
      } catch (err) {
        const message =
          err instanceof Error && err.message.includes('expired')
            ? 'Token expired'
            : 'Invalid token'
        throw new Response(JSON.stringify({ error: message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    })
    .onBeforeHandle({ as: 'scoped' }, ({ workerClaims }) => {
      if (workerClaims.scope !== 'worker') {
        return new Response(JSON.stringify({ error: 'Insufficient scope: worker scope required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    })

export function enforceCapabilities(
  jwtCapabilities: string[] | undefined,
  registeredCapabilities: string[],
): string[] {
  if (jwtCapabilities) {
    return registeredCapabilities.filter((cap) => jwtCapabilities.includes(cap))
  }
  return registeredCapabilities
}
