import { describe, expect, it } from 'bun:test'

// These tests require a running hub with database and a seeded root user.
// Run with: DATABASE_URL=... bun test test/e2e/auth.test.ts

const HUB_URL = process.env.HUB_URL || 'http://localhost:3721'
const ROOT_USER = process.env.DISPATCH_ROOT_USER_ID || 'rezics-root-001'
const ROOT_PASSWORD = process.env.DISPATCH_ROOT_PASSWORD!

describe('Auth - Password Login', () => {
  it('root login succeeds with correct credentials', async () => {
    const res = await fetch(`${HUB_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ROOT_USER, password: ROOT_PASSWORD }),
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.token).toBeDefined()
    expect(data.expiresAt).toBeDefined()

    const cookie = res.headers.get('set-cookie')
    expect(cookie).toContain('dispatch_session=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
  })

  it('wrong password returns 401', async () => {
    const res = await fetch(`${HUB_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ROOT_USER, password: 'wrong-password' }),
    })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Invalid credentials')
  })

  it('unknown username returns 401', async () => {
    const res = await fetch(`${HUB_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent-user', password: 'any-password' }),
    })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Invalid credentials')
  })

  it('non-root user login returns 403', async () => {
    // This test requires a non-root user to exist in the database.
    // Create one via direct DB access or a prior test setup.
    // For now, skip if DISPATCH_NONROOT_USER_ID is not set.
    const nonRootUser = process.env.DISPATCH_NONROOT_USER_ID
    if (!nonRootUser) return

    const res = await fetch(`${HUB_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: nonRootUser, password: 'any-password' }),
    })

    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toBe('Dashboard login requires root')
  })
})

describe('Auth - JWT Login', () => {
  it('missing credentials returns 401', async () => {
    const res = await fetch(`${HUB_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Missing credentials')
  })

  it('invalid Bearer token returns 401', async () => {
    const res = await fetch(`${HUB_URL}/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    })

    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBeDefined()
  })

  // JWT login with a valid token for root user requires a configured auth provider.
  // These tests are best run in an environment with a test IdP configured.
  // The key behavioral change: JWT login no longer upserts users — only existing root users get sessions.
})
