import type { TaskResult, Logger } from '@rezics/dispatch-type'
import type { TokenManager } from './auth'

interface ExternalResultItem {
  taskId: string
  project: string
  type: string
  data: TaskResult
}

interface ExternalFailItem {
  taskId: string
  error: string
  retryable: boolean
}

export class ExternalResultSubmitter {
  private endpoint: string
  private tokenManager: TokenManager
  private logger: Logger

  constructor(endpoint: string, tokenManager: TokenManager, logger: Logger) {
    this.endpoint = endpoint
    this.tokenManager = tokenManager
    this.logger = logger
  }

  async submitDone(items: ExternalResultItem[]): Promise<void> {
    if (items.length === 0) return
    await this.submitWithRetry({ done: items, failed: [] })
  }

  async submitFailed(items: ExternalFailItem[]): Promise<void> {
    if (items.length === 0) return
    await this.submitWithRetry({ done: [], failed: items })
  }

  async submitBatch(
    done: ExternalResultItem[],
    failed: ExternalFailItem[],
  ): Promise<void> {
    if (done.length === 0 && failed.length === 0) return
    await this.submitWithRetry({ done, failed })
  }

  private async submitWithRetry(
    body: { done: ExternalResultItem[]; failed: ExternalFailItem[] },
  ): Promise<void> {
    const maxAttempts = 3

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const token = this.tokenManager.current()
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        })

        if (res.ok) {
          this.logger.debug(
            `External submit: ${body.done.length} done, ${body.failed.length} failed`,
          )
          return
        }

        if (res.status === 401) {
          await this.tokenManager.refresh()
        }

        if (attempt < maxAttempts) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000)
          this.logger.warn(
            `External submit attempt ${attempt} failed (${res.status}), retrying in ${delay}ms`,
          )
          await sleep(delay)
        } else {
          throw new Error(`External submit failed after ${maxAttempts} attempts: ${res.status}`)
        }
      } catch (err) {
        if (attempt >= maxAttempts) {
          this.logger.error('External result submission failed', err)
          throw err
        }

        const delay = Math.min(1000 * 2 ** (attempt - 1), 10_000)
        this.logger.warn(
          `External submit attempt ${attempt} error, retrying in ${delay}ms`,
          err,
        )
        await sleep(delay)
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
