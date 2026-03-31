import { describe, test, expect, mock } from 'bun:test'
import { z } from 'zod'
import { definePlugin } from '@rezics/dispatch-type'
import type { Task, Logger } from '@rezics/dispatch-type'
import { PluginRegistry } from '../src/core/registry'

const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}

const makeTask = (type: string): Task => ({
  id: 'task-1',
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

const bookPlugin = definePlugin({
  name: 'book-crawler',
  version: '1.0.0',
  capabilities: ['book:crawl'],
  config: z.object({ rateLimit: z.number() }),
  handlers: {
    'book:crawl': async () => ({ strategy: 'discard' as const }),
  },
})

const animePlugin = definePlugin({
  name: 'anime-crawler',
  version: '1.0.0',
  capabilities: ['anime:crawl', 'anime:update'],
  config: z.object({}),
  handlers: {
    'anime:crawl': async () => ({ strategy: 'discard' as const }),
    'anime:update': async () => ({ strategy: 'discard' as const }),
  },
})

describe('PluginRegistry', () => {
  test('aggregates capabilities from multiple plugins', () => {
    const registry = new PluginRegistry(noopLogger)
    registry.register(bookPlugin, { rateLimit: 10 })
    registry.register(animePlugin, {})

    const caps = registry.getCapabilities()
    expect(caps).toContain('book:crawl')
    expect(caps).toContain('anime:crawl')
    expect(caps).toContain('anime:update')
    expect(caps).toHaveLength(3)
  })

  test('throws on capability collision', () => {
    const registry = new PluginRegistry(noopLogger)
    registry.register(bookPlugin, { rateLimit: 10 })

    const conflicting = definePlugin({
      name: 'other-book',
      version: '1.0.0',
      capabilities: ['book:crawl'],
      config: z.object({}),
      handlers: { 'book:crawl': async () => ({ strategy: 'discard' as const }) },
    })

    expect(() => registry.register(conflicting, {})).toThrow(
      'Capability collision: "book:crawl" is declared by both "book-crawler" and "other-book"',
    )
  })

  test('routes task to correct handler', async () => {
    const handler = mock(async () => ({ strategy: 'store' as const, data: { title: 'Book A' } }))
    const plugin = definePlugin({
      name: 'test',
      version: '1.0.0',
      capabilities: ['test:run'],
      config: z.object({}),
      handlers: { 'test:run': handler },
    })

    const registry = new PluginRegistry(noopLogger)
    registry.register(plugin, {})

    const result = await registry.route(makeTask('test:run'), async () => {})
    expect(result).toEqual({ strategy: 'store', data: { title: 'Book A' } })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  test('throws for missing handler', async () => {
    const registry = new PluginRegistry(noopLogger)

    await expect(registry.route(makeTask('unknown:action'), async () => {})).rejects.toThrow(
      'No handler found for task type "unknown:action"',
    )
  })

  test('calls onLoad in order at startup', async () => {
    const order: string[] = []
    const pluginA = definePlugin({
      name: 'a',
      version: '1.0.0',
      capabilities: ['a:run'],
      config: z.object({}),
      handlers: { 'a:run': async () => ({ strategy: 'discard' as const }) },
      onLoad: async () => { order.push('a') },
    })
    const pluginB = definePlugin({
      name: 'b',
      version: '1.0.0',
      capabilities: ['b:run'],
      config: z.object({}),
      handlers: { 'b:run': async () => ({ strategy: 'discard' as const }) },
      onLoad: async () => { order.push('b') },
    })

    const registry = new PluginRegistry(noopLogger)
    registry.register(pluginA, {})
    registry.register(pluginB, {})
    await registry.loadAll()

    expect(order).toEqual(['a', 'b'])
  })

  test('calls onUnload in reverse order at shutdown', async () => {
    const order: string[] = []
    const pluginA = definePlugin({
      name: 'a',
      version: '1.0.0',
      capabilities: ['a:run'],
      config: z.object({}),
      handlers: { 'a:run': async () => ({ strategy: 'discard' as const }) },
      onUnload: async () => { order.push('a') },
    })
    const pluginB = definePlugin({
      name: 'b',
      version: '1.0.0',
      capabilities: ['b:run'],
      config: z.object({}),
      handlers: { 'b:run': async () => ({ strategy: 'discard' as const }) },
      onUnload: async () => { order.push('b') },
    })

    const registry = new PluginRegistry(noopLogger)
    registry.register(pluginA, {})
    registry.register(pluginB, {})
    await registry.unloadAll()

    expect(order).toEqual(['b', 'a'])
  })

  test('provides scoped logger and progress to handler context', async () => {
    let receivedCtx: any = null
    const plugin = definePlugin({
      name: 'ctx-test',
      version: '1.0.0',
      capabilities: ['ctx:run'],
      config: z.object({ key: z.string() }),
      handlers: {
        'ctx:run': async (task, ctx) => {
          receivedCtx = ctx
          return { strategy: 'discard' as const }
        },
      },
    })

    const registry = new PluginRegistry(noopLogger)
    registry.register(plugin, { key: 'value' })

    const progressFn = mock(async () => {})
    await registry.route(makeTask('ctx:run'), progressFn)

    expect(receivedCtx.config).toEqual({ key: 'value' })
    expect(typeof receivedCtx.logger.info).toBe('function')
    expect(receivedCtx.progress).toBe(progressFn)
  })
})
