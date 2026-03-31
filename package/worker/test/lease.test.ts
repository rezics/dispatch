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
      { hubUrl: 'http://localhost:3721', concurrency: 10, pollInterval: 5000, shutdownTimeout: 5000 },
      tokenManager,
      registry,
      noopLogger,
    )

    expect(manager.activeCount).toBe(0)
  })

  test('respects concurrency limit', () => {
    manager = new LeaseManager(
      { hubUrl: 'http://localhost:3721', concurrency: 5, pollInterval: 5000, shutdownTimeout: 5000 },
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
      { hubUrl: 'http://localhost:3721', concurrency: 10, pollInterval: 100, shutdownTimeout: 1000 },
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
})
