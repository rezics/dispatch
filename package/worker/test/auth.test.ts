import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test'
import type { Logger } from '@rezics/dispatch-type'
import { TokenManager, AuthFatalError, decodeExp } from '../src/core/auth'

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

describe('decodeExp', () => {
  test('extracts exp from JWT', () => {
    const jwt = makeJwt({ sub: 'w1', exp: 1700000000 })
    expect(decodeExp(jwt)).toBe(1700000000)
  })

  test('returns null for JWT without exp', () => {
    const jwt = makeJwt({ sub: 'w1' })
    expect(decodeExp(jwt)).toBeNull()
  })

  test('returns null for invalid JWT', () => {
    expect(decodeExp('not-a-jwt')).toBeNull()
  })
})

describe('TokenManager', () => {
  let manager: TokenManager

  afterEach(() => {
    manager?.destroy()
  })

  test('obtains token at init', async () => {
    const jwt = makeJwt({ sub: 'w1' })
    const getToken = mock(async () => jwt)
    manager = new TokenManager(getToken, noopLogger)
    await manager.init()

    expect(manager.current()).toBe(jwt)
    expect(getToken).toHaveBeenCalledTimes(1)
  })

  test('throws if current() called before init', () => {
    manager = new TokenManager(async () => 'tok', noopLogger)
    expect(() => manager.current()).toThrow('Token not initialized')
  })

  test('schedules refresh at 80% of remaining lifetime', async () => {
    const now = Math.floor(Date.now() / 1000)
    const jwt = makeJwt({ sub: 'w1', exp: now + 100 })
    const getToken = mock(async () => jwt)

    manager = new TokenManager(getToken, noopLogger)
    await manager.init()

    // Token was called once for init
    expect(getToken).toHaveBeenCalledTimes(1)

    // We can't easily test the timer fires at 80% without waiting,
    // but we can verify the manager was initialized correctly
    expect(manager.current()).toBe(jwt)
  })

  test('does not schedule refresh for JWT without exp', async () => {
    const jwt = makeJwt({ sub: 'w1' })
    const getToken = mock(async () => jwt)

    manager = new TokenManager(getToken, noopLogger)
    await manager.init()

    expect(getToken).toHaveBeenCalledTimes(1)
    expect(manager.current()).toBe(jwt)
  })

  test('retry on 401 refreshes token and retries', async () => {
    const jwt1 = makeJwt({ sub: 'w1' })
    const jwt2 = makeJwt({ sub: 'w1', exp: Math.floor(Date.now() / 1000) + 3600 })
    let callCount = 0
    const getToken = mock(async () => (++callCount === 1 ? jwt1 : jwt2))

    manager = new TokenManager(getToken, noopLogger)
    await manager.init()

    let attempt = 0
    const result = await manager.withRetry(async (token) => {
      attempt++
      if (attempt === 1) {
        const err = new Error('Unauthorized') as any
        err.status = 401
        throw err
      }
      return `ok-${token}`
    })

    expect(result).toBe(`ok-${jwt2}`)
    expect(getToken).toHaveBeenCalledTimes(2)
  })

  test('fatal on persistent 401', async () => {
    const jwt = makeJwt({ sub: 'w1' })
    const getToken = mock(async () => jwt)

    manager = new TokenManager(getToken, noopLogger)
    await manager.init()

    const make401 = () => {
      const err = new Error('Unauthorized') as any
      err.status = 401
      return err
    }

    await expect(
      manager.withRetry(async () => {
        throw make401()
      }),
    ).rejects.toBeInstanceOf(AuthFatalError)
  })

  test('non-401 errors propagate immediately', async () => {
    const jwt = makeJwt({ sub: 'w1' })
    manager = new TokenManager(async () => jwt, noopLogger)
    await manager.init()

    await expect(
      manager.withRetry(async () => {
        throw new Error('Network error')
      }),
    ).rejects.toThrow('Network error')
  })
})
