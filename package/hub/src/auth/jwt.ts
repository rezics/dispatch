import * as jose from 'jose'

const jwksCache = new Map<string, ReturnType<typeof jose.createRemoteJWKSet>>()

export function getJWKS(uri: string) {
  let jwks = jwksCache.get(uri)
  if (!jwks) {
    jwks = jose.createRemoteJWKSet(new URL(uri))
    jwksCache.set(uri, jwks)
  }
  return jwks
}

/**
 * Verify a JWT against a single JWKS URI. Returns the full JWT payload.
 */
export async function verifyWorkerToken(
  token: string,
  jwksUri: string,
): Promise<jose.JWTPayload> {
  const jwks = getJWKS(jwksUri)
  const { payload } = await jose.jwtVerify(token, jwks)
  return payload
}
