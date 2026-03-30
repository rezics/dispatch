import * as jose from 'jose'

export interface AuthProvider {
  jwksUri: string
  audience: string
  issuer: string
}

export interface WorkerClaims {
  sub: string
  project: string
  capabilities?: string[]
  scope: string
  trust?: string
}

const jwksCache = new Map<string, jose.FlattenedJWSInput['alg'] extends string ? ReturnType<typeof jose.createRemoteJWKSet> : never>()

function getJWKS(uri: string) {
  let jwks = jwksCache.get(uri)
  if (!jwks) {
    jwks = jose.createRemoteJWKSet(new URL(uri))
    jwksCache.set(uri, jwks)
  }
  return jwks
}

export async function verifyWorkerToken(
  token: string,
  providers: AuthProvider[],
): Promise<WorkerClaims> {
  const errors: Error[] = []

  for (const provider of providers) {
    try {
      const jwks = getJWKS(provider.jwksUri)
      const { payload } = await jose.jwtVerify(token, jwks, {
        audience: provider.audience,
        issuer: provider.issuer,
      })

      return {
        sub: payload.sub!,
        project: payload.project as string,
        capabilities: payload.capabilities as string[] | undefined,
        scope: payload.scope as string,
        trust: payload.trust as string | undefined,
      }
    } catch (err) {
      errors.push(err as Error)
    }
  }

  throw errors[errors.length - 1] ?? new Error('No auth providers configured')
}
