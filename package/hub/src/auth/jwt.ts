import * as jose from 'jose'

export interface AuthProvider {
  jwksUri: string
  audience: string
  issuer: string
}

const jwksCache = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>()

function getJWKS(uri: string) {
  let jwks = jwksCache.get(uri)
  if (!jwks) {
    jwks = jose.createRemoteJWKSet(new URL(uri))
    jwksCache.set(uri, jwks)
  }
  return jwks
}

/**
 * Verify a JWT against configured providers. Returns the full JWT payload.
 */
export async function verifyWorkerToken(
  token: string,
  providers: AuthProvider[],
): Promise<jose.JWTPayload> {
  const errors: Error[] = []

  for (const provider of providers) {
    try {
      const jwks = getJWKS(provider.jwksUri)
      const { payload } = await jose.jwtVerify(token, jwks, {
        audience: provider.audience,
        issuer: provider.issuer,
      })
      return payload
    } catch (err) {
      errors.push(err as Error)
    }
  }

  throw errors[errors.length - 1] ?? new Error('No auth providers configured')
}
