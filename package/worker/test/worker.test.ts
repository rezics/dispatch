import { describe, test, expect, mock, afterEach } from 'bun:test'
import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-type'
import { defineWorkerConfig, createWorker } from '../src/index'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-sig`
}

const testPlugin = definePlugin({
  name: 'test-plugin',
  version: '1.0.0',
  capabilities: ['test:run', 'test:update'],
  config: z.object({}),
  handlers: {
    'test:run': async () => ({ strategy: 'discard' as const }),
    'test:update': async () => ({ strategy: 'store' as const, data: { updated: true } }),
  },
})

describe('createWorker', () => {
  test('creates worker with correct capabilities', () => {
    const config = defineWorkerConfig({
      hub: {
        url: 'https://hub.example.com',
        getToken: async () => makeJwt({ sub: 'w1' }),
      },
      plugin: [[testPlugin, {}]],
    })

    const worker = createWorker(config)
    expect(worker.capabilities()).toEqual(['test:run', 'test:update'])
  })

  test('creates worker in http mode with mock hub', async () => {
    const jwt = makeJwt({ sub: 'w1', project: 'test' })

    // Mock fetch: first claim returns tasks, then returns empty, complete returns ok
    let claimCount = 0
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      if (urlStr.includes('/tasks/claim')) {
        claimCount++
        if (claimCount === 1) {
          return new Response(
            JSON.stringify({
              tasks: [
                {
                  id: 't1',
                  project: 'test',
                  type: 'test:run',
                  payload: {},
                  priority: 5,
                  status: 'running',
                  workerId: 'w1',
                  attempts: 1,
                  maxAttempts: 3,
                  scheduledAt: new Date().toISOString(),
                  startedAt: new Date().toISOString(),
                  leaseExpiresAt: new Date(Date.now() + 300_000).toISOString(),
                  finishedAt: null,
                  error: null,
                  createdAt: new Date().toISOString(),
                },
              ],
              count: 1,
            }),
          )
        }
        return new Response(JSON.stringify({ tasks: [], count: 0 }))
      }
      if (urlStr.includes('/tasks/complete')) {
        return new Response(JSON.stringify({ ok: true }))
      }
      return new Response(JSON.stringify({}))
    }) as any

    const config = defineWorkerConfig({
      hub: {
        url: 'https://hub.example.com',
        getToken: async () => jwt,
      },
      mode: 'http',
      pollInterval: 1000,
      plugin: [[testPlugin, {}]],
    })

    const worker = createWorker(config)
    await worker.start()

    // Let it claim, execute, and complete
    await new Promise((r) => setTimeout(r, 500))

    await worker.stop()

    // Verify claim was called
    expect(claimCount).toBeGreaterThanOrEqual(1)

    globalThis.fetch = originalFetch
  })
})
