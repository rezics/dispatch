import { describe, test, expect } from 'bun:test'
import { z } from 'zod'
import { defineWorkerConfig } from '../src/core/config'
import { definePlugin } from '@rezics/dispatch-type'

const mockGetToken = async () => 'mock-jwt-token'

const testPlugin = definePlugin({
  name: 'test-plugin',
  version: '1.0.0',
  capabilities: ['test:run'],
  config: z.object({ rateLimit: z.number() }),
  handlers: {
    'test:run': async () => ({ strategy: 'discard' as const }),
  },
})

describe('defineWorkerConfig', () => {
  test('minimal config returns defaults', () => {
    const config = defineWorkerConfig({
      hub: { url: 'https://hub.example.com', getToken: mockGetToken },
    })

    expect(config.mode).toBe('http')
    expect(config.concurrency).toBe(10)
    expect(config.pollInterval).toBe(5000)
    expect(config.shutdownTimeout).toBe(30000)
    expect(config.plugins).toEqual([])
    expect(config.hub.url).toBe('https://hub.example.com')
  })

  test('custom concurrency and mode', () => {
    const config = defineWorkerConfig({
      hub: { url: 'https://hub.example.com', getToken: mockGetToken },
      mode: 'ws',
      concurrency: 50,
    })

    expect(config.mode).toBe('ws')
    expect(config.concurrency).toBe(50)
  })

  test('invalid URL rejected', () => {
    expect(() =>
      defineWorkerConfig({
        hub: { url: 'not-a-url', getToken: mockGetToken },
      }),
    ).toThrow()
  })

  test('valid plugin config accepted', () => {
    const config = defineWorkerConfig({
      hub: { url: 'https://hub.example.com', getToken: mockGetToken },
      plugin: [[testPlugin, { rateLimit: 10 }]],
    })

    expect(config.plugins).toHaveLength(1)
    expect(config.plugins[0].config).toEqual({ rateLimit: 10 })
  })

  test('invalid plugin config rejected', () => {
    expect(() =>
      defineWorkerConfig({
        hub: { url: 'https://hub.example.com', getToken: mockGetToken },
        plugin: [[testPlugin, { rateLimit: 'fast' }]],
      }),
    ).toThrow()
  })

  test('auto-converts https:// to wss:// in ws mode', () => {
    const config = defineWorkerConfig({
      hub: { url: 'https://hub.example.com', getToken: mockGetToken },
      mode: 'ws',
    })

    expect(config.hub.url).toBe('wss://hub.example.com')
  })

  test('auto-converts http:// to ws:// in ws mode', () => {
    const config = defineWorkerConfig({
      hub: { url: 'http://hub.example.com', getToken: mockGetToken },
      mode: 'ws',
    })

    expect(config.hub.url).toBe('ws://hub.example.com')
  })

  test('preserves wss:// in ws mode', () => {
    const config = defineWorkerConfig({
      hub: { url: 'wss://hub.example.com', getToken: mockGetToken },
      mode: 'ws',
    })

    expect(config.hub.url).toBe('wss://hub.example.com')
  })

  test('does not convert URL in http mode', () => {
    const config = defineWorkerConfig({
      hub: { url: 'https://hub.example.com', getToken: mockGetToken },
      mode: 'http',
    })

    expect(config.hub.url).toBe('https://hub.example.com')
  })
})
