import { describe, expect, test, beforeAll } from 'bun:test'
import * as jose from 'jose'
import { verifyWorkerToken, type AuthProvider } from '../src/auth/jwt'
import { enforceCapabilities } from '../src/auth/middleware'

let privateKey: CryptoKey
let publicKey: CryptoKey
let jwksServer: ReturnType<typeof Bun.serve> | null = null
let provider: AuthProvider

beforeAll(async () => {
  const keyPair = await jose.generateKeyPair('RS256')
  privateKey = keyPair.privateKey
  publicKey = keyPair.publicKey

  const jwk = await jose.exportJWK(publicKey)
  jwk.kid = 'test-key'
  jwk.alg = 'RS256'
  jwk.use = 'sig'

  jwksServer = Bun.serve({
    port: 0,
    fetch() {
      return new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    },
  })

  provider = {
    jwksUri: `http://localhost:${jwksServer.port}/.well-known/jwks.json`,
    audience: 'dispatch-hub',
    issuer: 'test-issuer',
  }
})

async function signToken(claims: Record<string, unknown>, options?: { expiresIn?: string }) {
  return new jose.SignJWT(claims as jose.JWTPayload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuedAt()
    .setExpirationTime(options?.expiresIn ?? '1h')
    .setAudience('dispatch-hub')
    .setIssuer('test-issuer')
    .setSubject(claims.sub as string)
    .sign(privateKey)
}

describe('verifyWorkerToken', () => {
  test('valid token accepted', async () => {
    const token = await signToken({
      sub: 'worker-1',
      project: 'crawl',
      scope: 'worker',
      trust: 'full',
    })

    const claims = await verifyWorkerToken(token, [provider])
    expect(claims.sub).toBe('worker-1')
    expect(claims.project).toBe('crawl')
    expect(claims.scope).toBe('worker')
    expect(claims.trust).toBe('full')
  })

  test('expired token rejected', async () => {
    const token = await signToken(
      { sub: 'worker-1', project: 'crawl', scope: 'worker' },
      { expiresIn: '-1s' },
    )

    await expect(verifyWorkerToken(token, [provider])).rejects.toThrow()
  })

  test('wrong audience rejected', async () => {
    const token = await new jose.SignJWT({ sub: 'w1', project: 'crawl', scope: 'worker' })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .setAudience('wrong-audience')
      .setIssuer('test-issuer')
      .setSubject('w1')
      .sign(privateKey)

    await expect(verifyWorkerToken(token, [provider])).rejects.toThrow()
  })
})

describe('enforceCapabilities', () => {
  test('JWT capabilities override registration', () => {
    const result = enforceCapabilities(['book:crawl'], ['book:crawl', 'book:update'])
    expect(result).toEqual(['book:crawl'])
  })

  test('no JWT capabilities returns all registered', () => {
    const result = enforceCapabilities(undefined, ['book:crawl', 'book:update'])
    expect(result).toEqual(['book:crawl', 'book:update'])
  })
})
