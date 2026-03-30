import { describe, expect, test } from 'bun:test'
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

function makeEnv(overrides: Record<string, string> = {}) {
  const base: Record<string, string> = {
    DATABASE_URL: 'postgresql://dispatch:dispatch@localhost:5432/dispatch',
    ...overrides,
  }
  return createEnv({
    server: {
      DATABASE_URL: z.string().url(),
      PORT: z.coerce.number().default(3721),
      NODE_ENV: z.enum(['development', 'production']).default('development'),
      REAPER_INTERVAL: z.string().default('30s'),
      DISPATCH_DISABLE_DASHBOARD: z
        .string()
        .default('false')
        .transform((v) => v === 'true'),
    },
    runtimeEnv: base,
  })
}

describe('env validation', () => {
  test('missing DATABASE_URL fails', () => {
    expect(() =>
      createEnv({
        server: {
          DATABASE_URL: z.string().url(),
        },
        runtimeEnv: {},
      }),
    ).toThrow()
  })

  test('defaults are applied when not specified', () => {
    const result = makeEnv()
    expect(result.PORT).toBe(3721)
    expect(result.NODE_ENV).toBe('development')
    expect(result.REAPER_INTERVAL).toBe('30s')
    expect(result.DISPATCH_DISABLE_DASHBOARD).toBe(false)
  })

  test('custom PORT is respected', () => {
    const result = makeEnv({ PORT: '8080' })
    expect(result.PORT).toBe(8080)
  })
})
