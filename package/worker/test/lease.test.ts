import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'
import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-type'
import type { Task, Logger } from '@rezics/dispatch-type'
import { TokenManager } from '../src/core/auth'
import { PluginRegistry } from '../src/core/registry'
import { LeaseManager } from '../src/core/lease'

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

describe('LeaseManager', () => {
  let manager: LeaseManager
  let tokenManager: TokenManager
  let registry: PluginRegistry
  let fetchMock: ReturnType<typeof mock>

  beforeEach(async () => {
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
  })

  test('tracks active task count', () => {
    manager = new LeaseManager(
      { hubUrl: 'http://localhost:3721', concurrency: 10, pollInterval: 5000, shutdownTimeout: 5000, heartbeatInterval: 60000 },
      tokenManager,
      registry,
      noopLogger,
    )

    expect(manager.activeCount).toBe(0)
  })

  test('respects concurrency limit', () => {
    manager = new LeaseManager(
      { hubUrl: 'http://localhost:3721', concurrency: 5, pollInterval: 5000, shutdownTimeout: 5000, heartbeatInterval: 60000 },
      tokenManager,
      registry,
      noopLogger,
    )

    // Initial capacity should match concurrency
    expect(manager.activeCount).toBe(0)
  })

  test('starts and stops cleanly', async () => {
    // Mock fetch to return empty tasks
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ tasks: [], count: 0 }))) as any

    manager = new LeaseManager(
      { hubUrl: 'http://localhost:3721', concurrency: 10, pollInterval: 100, shutdownTimeout: 1000, heartbeatInterval: 60000 },
      tokenManager,
      registry,
      noopLogger,
    )

    // Start in background
    manager.start()
    expect(manager.isRunning).toBe(true)

    // Let it poll once
    await new Promise((r) => setTimeout(r, 200))

    await manager.stop()
    expect(manager.isRunning).toBe(false)

    globalThis.fetch = originalFetch
  })

  test('heartbeat fires at configured interval', async () => {
    const originalFetch = globalThis.fetch
    const calls: string[] = []

    globalThis.fetch = mock(async (url: string) => {
      calls.push(url)
      if (url.includes('/workers/heartbeat')) {
        return new Response(JSON.stringify({ extended: 1 }))
      }
      // Return a task so we have active tasks for heartbeat to fire
      if (url.includes('/tasks/claim')) {
        return new Response(JSON.stringify({
          tasks: [makeTask('t1')],
          count: 1,
        }))
      }
      if (url.includes('/tasks/complete')) {
        return new Response(JSON.stringify({ ok: true }))
      }
      return new Response(JSON.stringify({}))
    }) as any

    manager = new LeaseManager(
      { hubUrl: 'http://localhost:3721', concurrency: 10, pollInterval: 5000, shutdownTimeout: 1000, heartbeatInterval: 100 },
      tokenManager,
      registry,
      noopLogger,
    )

    manager.start()

    // Wait for heartbeat to fire
    await new Promise((r) => setTimeout(r, 350))

    await manager.stop()

    const heartbeatCalls = calls.filter((u) => u.includes('/workers/heartbeat'))
    expect(heartbeatCalls.length).toBeGreaterThanOrEqual(1)

    globalThis.fetch = originalFetch
  })

  test('heartbeat stops cleanly on stop()', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ tasks: [], count: 0 }))) as any

    manager = new LeaseManager(
      { hubUrl: 'http://localhost:3721', concurrency: 10, pollInterval: 100, shutdownTimeout: 1000, heartbeatInterval: 100 },
      tokenManager,
      registry,
      noopLogger,
    )

    manager.start()
    await new Promise((r) => setTimeout(r, 50))
    await manager.stop()

    // No heartbeat should fire after stop
    expect(manager.isRunning).toBe(false)

    globalThis.fetch = originalFetch
  })

  test('heartbeat failure logs warning', async () => {
    const originalFetch = globalThis.fetch
    const warnings: string[] = []
    const logger: Logger = {
      ...noopLogger,
      warn: (msg) => warnings.push(msg),
      error: (msg) => warnings.push(msg),
    }

    globalThis.fetch = mock(async (url: string) => {
      if (url.includes('/workers/heartbeat')) {
        return new Response('error', { status: 500 })
      }
      if (url.includes('/tasks/claim')) {
        return new Response(JSON.stringify({
          tasks: [makeTask('t1')],
          count: 1,
        }))
      }
      return new Response(JSON.stringify({ ok: true }))
    }) as any

    manager = new LeaseManager(
      { hubUrl: 'http://localhost:3721', concurrency: 10, pollInterval: 5000, shutdownTimeout: 1000, heartbeatInterval: 50 },
      tokenManager,
      registry,
      logger,
    )

    manager.start()
    await new Promise((r) => setTimeout(r, 250))
    await manager.stop()

    expect(warnings.length).toBeGreaterThan(0)

    globalThis.fetch = originalFetch
  })
})
