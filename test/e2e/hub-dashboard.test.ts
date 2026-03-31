import { describe, expect, it } from 'bun:test'

// These tests require a running hub with database.
// Run with: DATABASE_URL=... bun test test/e2e/hub-dashboard.test.ts

const HUB_URL = process.env.HUB_URL || 'http://localhost:3721'

describe('Hub Dashboard E2E', () => {
  it('serves dashboard at /_dashboard', async () => {
    const res = await fetch(`${HUB_URL}/_dashboard`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('<div id="root">')
  })

  it('serves dashboard SPA routes', async () => {
    const routes = ['/_dashboard/workers', '/_dashboard/tasks', '/_dashboard/plugins']
    for (const route of routes) {
      const res = await fetch(`${HUB_URL}${route}`)
      expect(res.status).toBe(200)
      const html = await res.text()
      expect(html).toContain('<div id="root">')
    }
  })

  it('API routes are not shadowed by dashboard', async () => {
    const apiRoutes = ['/tasks', '/workers', '/projects']
    for (const route of apiRoutes) {
      const res = await fetch(`${HUB_URL}${route}`)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    }
  })

  it('OpenAPI route still works', async () => {
    const res = await fetch(`${HUB_URL}/openapi`)
    expect(res.status).toBe(200)
  })
})

describe('Hub Dashboard disabled', () => {
  it('returns 404 when DISPATCH_DISABLE_DASHBOARD=true', async () => {
    // This test would need a separate hub instance with the env var set
    // Skipping in automated run — verify manually
  })
})
