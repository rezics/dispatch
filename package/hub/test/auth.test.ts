import { describe, expect, test, beforeAll } from 'bun:test'
import * as jose from 'jose'
import { verifyWorkerToken } from '../src/auth/jwt'
import { requireProjectAccess, type WorkerIdentity } from '../src/auth/middleware'

let privateKey: CryptoKey
let publicKey: CryptoKey
let jwksServer: ReturnType<typeof Bun.serve> | null = null
let jwksUri: string

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

  jwksUri = `http://localhost:${jwksServer.port}/.well-known/jwks.json`
})

async function signToken(claims: Record<string, unknown>, options?: { expiresIn?: string }) {
  return new jose.SignJWT(claims as jose.JWTPayload)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setIssuedAt()
    .setExpirationTime(options?.expiresIn ?? '1h')
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

    const claims = await verifyWorkerToken(token, jwksUri)
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

    await expect(verifyWorkerToken(token, jwksUri)).rejects.toThrow()
  })
})

describe('requireProjectAccess', () => {
  test('matching project passes', () => {
    const identity: WorkerIdentity = { sub: 'worker-1', project: 'alpha' }
    expect(() => requireProjectAccess(identity, 'alpha')).not.toThrow()
  })

  test('mismatched project throws', () => {
    const identity: WorkerIdentity = { sub: 'worker-1', project: 'alpha' }
    expect(() => requireProjectAccess(identity, 'beta')).toThrow()
  })
})
