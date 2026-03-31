import { describe, test, expect, mock } from 'bun:test'
import type { ResultPlugin, ResultPluginTask } from '../src/plugin/interface'
import { createDiscardPlugin } from '../src/plugin/discard'
import { createWebhookPlugin } from '../src/plugin/webhook'

const makeTask = (id = 't1', project = 'test'): ResultPluginTask => ({
  id,
  project,
  type: 'test:run',
})

describe('discard plugin', () => {
  test('is a no-op', async () => {
    const plugin = createDiscardPlugin()
    expect(plugin.id).toBe('discard')
    // Should not throw
    await plugin.handle(makeTask(), { strategy: 'discard' })
  })
})

describe('webhook plugin', () => {
  test('sends HTTP POST', async () => {
    const plugin = createWebhookPlugin()
    expect(plugin.id).toBe('webhook')

    const originalFetch = globalThis.fetch
    const mockFetch = mock(async () => new Response('ok', { status: 200 }))
    globalThis.fetch = mockFetch as any

    await plugin.handle(makeTask(), {
      strategy: 'webhook',
      url: 'https://api.example.com/hook',
      data: { id: 1 },
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example.com/hook')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body as string)).toEqual({ id: 1 })

    globalThis.fetch = originalFetch
  })

  test('includes custom headers', async () => {
    const plugin = createWebhookPlugin()

    const originalFetch = globalThis.fetch
    const mockFetch = mock(async () => new Response('ok', { status: 200 }))
    globalThis.fetch = mockFetch as any

    await plugin.handle(makeTask(), {
      strategy: 'webhook',
      url: 'https://api.example.com/hook',
      data: {},
      headers: { 'X-API-Key': 'secret' },
    })

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect((opts.headers as Record<string, string>)['X-API-Key']).toBe('secret')

    globalThis.fetch = originalFetch
  })

  test('logs warning on non-2xx response', async () => {
    const plugin = createWebhookPlugin()

    const originalFetch = globalThis.fetch
    globalThis.fetch = mock(async () => new Response('error', { status: 500 })) as any

    // Should not throw
    await plugin.handle(makeTask(), {
      strategy: 'webhook',
      url: 'https://api.example.com/hook',
      data: {},
    })

    globalThis.fetch = originalFetch
  })
})

describe('custom result plugin', () => {
  test('satisfies interface', () => {
    const plugin: ResultPlugin = {
      id: 'elasticsearch',
      async handle(task, result) {
        // Index into ES
      },
    }
    expect(plugin.id).toBe('elasticsearch')
  })
})
