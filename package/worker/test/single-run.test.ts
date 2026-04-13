import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'
import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-type'
import type { Task, Logger } from '@rezics/dispatch-type'
import { TokenManager } from '../src/core/auth'
import { PluginRegistry } from '../src/core/registry'
import { SingleRunManager } from '../src/core/single-run'

const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-sig`
}

const makeTask = (id: string, type = 'test:run'): Task => ({
  id,
  project: 'test',
  type,
  payload: {},
  priority: 5,
  status: 'running',
  workerId: 'w1',
  attempts: 1,
  maxAttempts: 3,
  scheduledAt: new Date(),
  startedAt: new Date(),
  leaseExpiresAt: new Date(Date.now() + 300_000),
  maxHoldExpiresAt: null,
  finishedAt: null,
  error: null,
  createdAt: new Date(),
})

describe('SingleRunManager', () => {
  let manager: SingleRunManager
  let tokenManager: TokenManager
  let registry: PluginRegistry
  let originalFetch: typeof globalThis.fetch

  beforeEach(async () => {
    originalFetch = globalThis.fetch
    const jwt = makeJwt({ sub: 'w1', project: 'test' })
    tokenManager = new TokenManager(async () => jwt, noopLogger)
    await tokenManager.init()

    registry = new PluginRegistry(noopLogger)
    const plugin = definePlugin({
      name: 'test',
      version: '1.0.0',
      capabilities: ['test:run'],
      config: z.object({}),
      handlers: {
        'test:run': async () => ({ strategy: 'discard' as const }),
      },
    })
    registry.register(plugin, {})
  })

  afterEach(() => {
    manager?.stop()
    tokenManager?.destroy()
    globalThis.fetch = originalFetch
  })

  test('all tasks complete before timeout', async () => {
    const tasks = [makeTask('t1'), makeTask('t2'), makeTask('t3')]

    globalThis.fetch = mock(async (url: string) => {
      if (url.includes('/tasks/claim')) {
        return new Response(JSON.stringify({ tasks, count: tasks.length }))
      }
      if (url.includes('/tasks/complete')) {
        return new Response(JSON.stringify({ ok: true }))
      }
      if (url.includes('/workers/heartbeat')) {
        return new Response(JSON.stringify({ extended: 3 }))
      }
      return new Response(JSON.stringify({}))
    }) as any

    manager = new SingleRunManager(
      {
        hubUrl: 'http://localhost:3721',
        concurrency: 10,
        shutdownTimeout: 1000,
        heartbeatInterval: 60000,
        timeout: 10000,
        claimCount: 10,
      },
      tokenManager,
      registry,
      noopLogger,
    )

    const result = await manager.start()
    expect(result.claimed).toBe(3)
    expect(result.completed).toBe(3)
    expect(result.failed).toBe(0)
    expect(result.abandoned).toBe(0)
  })

  test('no tasks available returns immediately', async () => {
    globalThis.fetch = mock(async (url: string) => {
      if (url.includes('/tasks/claim')) {
        return new Response(JSON.stringify({ tasks: [], count: 0 }))
      }
      return new Response(JSON.stringify({}))
    }) as any

    manager = new SingleRunManager(
      {
        hubUrl: 'http://localhost:3721',
        concurrency: 10,
        shutdownTimeout: 1000,
        heartbeatInterval: 60000,
        timeout: 10000,
        claimCount: 10,
      },
      tokenManager,
      registry,
      noopLogger,
    )

    const result = await manager.start()
    expect(result.claimed).toBe(0)
    expect(result.completed).toBe(0)
  })

  test('timeout stops processing', async () => {
    // Create a slow plugin
    const slowRegistry = new PluginRegistry(noopLogger)
    const slowPlugin = definePlugin({
      name: 'slow',
      version: '1.0.0',
      capabilities: ['test:run'],
      config: z.object({}),
      handlers: {
        'test:run': async () => {
          await new Promise((r) => setTimeout(r, 5000))
          return { strategy: 'discard' as const }
        },
      },
    })
    slowRegistry.register(slowPlugin, {})

    const tasks = [makeTask('t1'), makeTask('t2')]

    globalThis.fetch = mock(async (url: string) => {
      if (url.includes('/tasks/claim')) {
        return new Response(JSON.stringify({ tasks, count: tasks.length }))
      }
      if (url.includes('/tasks/complete')) {
        return new Response(JSON.stringify({ ok: true }))
      }
      if (url.includes('/workers/heartbeat')) {
        return new Response(JSON.stringify({ extended: 2 }))
      }
      return new Response(JSON.stringify({}))
    }) as any

    manager = new SingleRunManager(
      {
        hubUrl: 'http://localhost:3721',
        concurrency: 10,
        shutdownTimeout: 100,
        heartbeatInterval: 60000,
        timeout: 200,
        claimCount: 10,
      },
      tokenManager,
      slowRegistry,
      noopLogger,
    )

    const result = await manager.start()
    expect(result.claimed).toBe(2)
    expect(result.abandoned).toBeGreaterThan(0)
  })
})
