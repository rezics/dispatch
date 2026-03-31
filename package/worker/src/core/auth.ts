import type { Logger } from '@rezics/dispatch-type'

export class TokenManager {
  private token: string | null = null
  private refreshTimer: ReturnType<typeof setTimeout> | null = null
  private getToken: () => Promise<string>
  private logger: Logger

  constructor(getToken: () => Promise<string>, logger: Logger) {
    this.getToken = getToken
    this.logger = logger
  }

  async init(): Promise<void> {
    await this.refresh()
  }

  async refresh(): Promise<void> {
    this.clearRefreshTimer()
    this.token = await this.getToken()
    this.scheduleRefresh(this.token)
  }

  current(): string {
    if (!this.token) throw new Error('Token not initialized — call init() first')
    return this.token
  }

  async withRetry<T>(fn: (token: string) => Promise<T>): Promise<T> {
    try {
      return await fn(this.current())
    } catch (err) {
      if (isAuthError(err)) {
        this.logger.warn('Got 401, refreshing token and retrying')
        await this.refresh()
        try {
          return await fn(this.current())
        } catch (retryErr) {
          if (isAuthError(retryErr)) {
            this.logger.error('Persistent auth failure after token refresh')
            throw new AuthFatalError('Persistent auth failure — stopping worker')
          }
          throw retryErr
        }
      }
      throw err
    }
  }

  destroy(): void {
    this.clearRefreshTimer()
  }

  private scheduleRefresh(jwt: string): void {
    const exp = decodeExp(jwt)
    if (exp === null) return

    const now = Math.floor(Date.now() / 1000)
    const remaining = exp - now
    if (remaining <= 0) return

    const refreshIn = Math.floor(remaining * 0.8) * 1000
    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refresh()
        this.logger.debug('Token refreshed successfully')
      } catch (err) {
        this.logger.error('Failed to refresh token', err)
      }
    }, refreshIn)

    // Don't keep the process alive just for token refresh
    if (this.refreshTimer && typeof this.refreshTimer === 'object' && 'unref' in this.refreshTimer) {
      this.refreshTimer.unref()
    }
  }

  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }
}

export class AuthFatalError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthFatalError'
  }
}

function isAuthError(err: unknown): boolean {
  if (err instanceof Response) return err.status === 401
  if (err && typeof err === 'object' && 'status' in err) return (err as any).status === 401
  return false
}

export function decodeExp(jwt: string): number | null {
  try {
    const parts = jwt.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}
