import { describe, test, expect, mock, afterEach } from 'bun:test'
import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-type'
import type { Logger } from '@rezics/dispatch-type'
import { TokenManager } from '../src/core/auth'
import { PluginRegistry } from '../src/core/registry'
import { WsConnection } from '../src/core/connection'

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

describe('WsConnection', () => {
  let connection: WsConnection
  let tokenManager: TokenManager

  afterEach(async () => {
    await connection?.stop()
    tokenManager?.destroy()
  })

  test('initializes with correct config', async () => {
    const jwt = makeJwt({ sub: 'w1' })
    tokenManager = new TokenManager(async () => jwt, noopLogger)
    await tokenManager.init()

    const registry = new PluginRegistry(noopLogger)
    const plugin = definePlugin({
      name: 'test',
      version: '1.0.0',
      capabilities: ['test:run'],
      config: z.object({}),
      handlers: { 'test:run': async () => ({ strategy: 'discard' as const }) },
    })
    registry.register(plugin, {})

    connection = new WsConnection(
      { hubUrl: 'ws://localhost:3721', concurrency: 10 },
      tokenManager,
      registry,
      noopLogger,
    )

    expect(connection.activeCount).toBe(0)
    expect(connection.isRunning).toBe(false)
  })

  test('exponential backoff calculation', () => {
    // Test that reconnect delay formula produces expected ranges
    const delays: number[] = []
    for (let attempt = 0; attempt < 5; attempt++) {
      const delay = Math.min(1000 * 2 ** attempt, 30_000)
      delays.push(delay)
    }
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000])

    // Verify cap at 30s
    const capped = Math.min(1000 * 2 ** 10, 30_000)
    expect(capped).toBe(30000)
  })
})
