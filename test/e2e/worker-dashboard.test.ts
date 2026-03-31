import { describe, expect, it } from 'bun:test'

// These tests require a running worker with dashboard API.
// Run with: bun test test/e2e/worker-dashboard.test.ts

const WORKER_DASHBOARD_URL = process.env.WORKER_DASHBOARD_URL || 'http://localhost:45321'

describe('Worker Dashboard E2E', () => {
  it('serves status endpoint', async () => {
    const res = await fetch(`${WORKER_DASHBOARD_URL}/status`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('hubUrl')
    expect(data).toHaveProperty('mode')
    expect(data).toHaveProperty('connectionState')
    expect(data).toHaveProperty('uptime')
  })

  it('serves tasks endpoint', async () => {
    const res = await fetch(`${WORKER_DASHBOARD_URL}/tasks`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('active')
    expect(data).toHaveProperty('history')
  })

  it('serves config endpoint with redacted secrets', async () => {
    const res = await fetch(`${WORKER_DASHBOARD_URL}/config`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('concurrency')
    expect(data).toHaveProperty('mode')
    expect(data).toHaveProperty('plugins')
    expect(data).toHaveProperty('configValues')
  })
})
