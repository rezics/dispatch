import { describe, expect, test } from 'bun:test'
import { z } from 'zod'
import { definePlugin } from '../src/plugin'

describe('definePlugin', () => {
  const configSchema = z.object({ rateLimit: z.number() })

  test('valid plugin passes when all capabilities have handlers', () => {
    const plugin = definePlugin({
      name: 'test-plugin',
      version: '1.0.0',
      capabilities: ['book:crawl'],
      config: configSchema,
      handlers: {
        'book:crawl': async () => ({ strategy: 'discard' as const }),
      },
    })

    expect(plugin.name).toBe('test-plugin')
    expect(plugin.capabilities).toEqual(['book:crawl'])
  })

  test('throws when a capability is missing its handler', () => {
    expect(() =>
      definePlugin({
        name: 'bad-plugin',
        version: '1.0.0',
        capabilities: ['book:crawl', 'book:update'],
        config: configSchema,
        handlers: {
          'book:crawl': async () => ({ strategy: 'discard' as const }),
        },
      }),
    ).toThrow('Missing handlers for capabilities: book:update')
  })

  test('throws naming all missing capabilities', () => {
    expect(() =>
      definePlugin({
        name: 'empty-plugin',
        version: '1.0.0',
        capabilities: ['a', 'b', 'c'],
        config: configSchema,
        handlers: {},
      }),
    ).toThrow('Missing handlers for capabilities: a, b, c')
  })
})
