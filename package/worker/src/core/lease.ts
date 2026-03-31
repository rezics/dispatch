import type { Task, TaskResult, Logger } from '@rezics/dispatch-type'
import type { TokenManager } from './auth'
import type { PluginRegistry } from './registry'

export interface LeaseConfig {
  hubUrl: string
  concurrency: number
  pollInterval: number
  shutdownTimeout: number
}

interface TaskOutcome {
  id: string
  status: 'done' | 'failed'
  result?: TaskResult
  error?: string
  retryable?: boolean
}

export class LeaseManager {
  private config: LeaseConfig
  private tokenManager: TokenManager
  private registry: PluginRegistry
  private logger: Logger

  private running = false
  private shuttingDown = false
  private activeTasks = new Map<string, AbortController>()
  private renewalTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private pendingResults: TaskOutcome[] = []
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private partialSubmitTimer: ReturnType<typeof setInterval> | null = null

  constructor(
    config: LeaseConfig,
    tokenManager: TokenManager,
    registry: PluginRegistry,
    logger: Logger,
  ) {
    this.config = config
    this.tokenManager = tokenManager
    this.registry = registry
    this.logger = logger
  }

  get activeCount(): number {
    return this.activeTasks.size
  }

  get isRunning(): boolean {
    return this.running
  }

  async start(): Promise<void> {
    this.running = true
    this.logger.info('Starting HTTP Lease mode')

    // Start partial completion timer (every 10s)
    this.partialSubmitTimer = setInterval(() => this.submitPartialResults(), 10_000)
    if (this.partialSubmitTimer && typeof this.partialSubmitTimer === 'object' && 'unref' in this.partialSubmitTimer) {
      this.partialSubmitTimer.unref()
    }

    this.pollLoop()
  }

  async stop(): Promise<void> {
    this.shuttingDown = true
    this.running = false
    this.logger.info('Stopping HTTP Lease mode — waiting for in-flight tasks')

    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.partialSubmitTimer) {
      clearInterval(this.partialSubmitTimer)
      this.partialSubmitTimer = null
    }

    // Wait for in-flight tasks up to shutdownTimeout
    const deadline = Date.now() + this.config.shutdownTimeout
    while (this.activeTasks.size > 0 && Date.now() < deadline) {
      await sleep(200)
    }

    if (this.activeTasks.size > 0) {
      this.logger.warn(`Shutdown timeout — ${this.activeTasks.size} tasks still running`)
      // Abort remaining tasks
      for (const [, ctrl] of this.activeTasks) {
        ctrl.abort()
      }
    }

    // Clear renewal timers
    for (const [, timer] of this.renewalTimers) {
      clearTimeout(timer)
    }
    this.renewalTimers.clear()

    // Submit any remaining results
    await this.submitResults()
    this.logger.info('HTTP Lease mode stopped')
  }

  private async pollLoop(): Promise<void> {
    while (this.running && !this.shuttingDown) {
      const remaining = this.config.concurrency - this.activeTasks.size
      if (remaining <= 0) {
        await sleep(500)
        continue
      }

      try {
        const tasks = await this.claim(remaining)
        if (tasks.length === 0) {
          await sleep(this.config.pollInterval)
          continue
        }

        this.logger.debug(`Claimed ${tasks.length} tasks`)

        // Schedule lease renewal
        this.scheduleRenewal(tasks)

        // Execute tasks concurrently
        for (const task of tasks) {
          this.executeTask(task)
        }
      } catch (err) {
        this.logger.error('Poll error', err)
        await sleep(this.config.pollInterval)
      }
    }
  }

  private async claim(count: number): Promise<Task[]> {
    return this.tokenManager.withRetry(async (token) => {
      const res = await fetch(`${this.config.hubUrl}/tasks/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ count, lease: '300s' }),
      })

      if (res.status === 401) {
        const err = new Error('Unauthorized') as any
        err.status = 401
        throw err
      }

      if (!res.ok) {
        throw new Error(`Claim failed: ${res.status} ${await res.text()}`)
      }

      const data = await res.json() as { tasks: Task[] }
      return data.tasks
    })
  }

  private scheduleRenewal(tasks: Task[]): void {
    // Schedule renewal at 70% of lease (300s default = 210s)
    const leaseMs = 300_000
    const renewAt = leaseMs * 0.7
    const taskIds = tasks.map((t) => t.id)
    const batchKey = taskIds.join(',')

    const timer = setTimeout(async () => {
      // Only renew tasks still active
      const activeIds = taskIds.filter((id) => this.activeTasks.has(id))
      if (activeIds.length === 0) return

      try {
        await this.renewLease(activeIds)
        this.logger.debug(`Renewed lease for ${activeIds.length} tasks`)
      } catch (err) {
        this.logger.error('Lease renewal failed', err)
      }
    }, renewAt)

    this.renewalTimers.set(batchKey, timer)
  }

  private async renewLease(taskIds: string[]): Promise<void> {
    await this.tokenManager.withRetry(async (token) => {
      const res = await fetch(`${this.config.hubUrl}/tasks/lease/renew`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskIds, extend: '300s' }),
      })

      if (res.status === 401) {
        const err = new Error('Unauthorized') as any
        err.status = 401
        throw err
      }

      if (!res.ok) {
        throw new Error(`Renew failed: ${res.status}`)
      }
    })
  }

  private executeTask(task: Task): void {
    const controller = new AbortController()
    this.activeTasks.set(task.id, controller)

    const progressFn = async (percent: number, message?: string) => {
      this.logger.debug(`Task ${task.id} progress: ${percent}%${message ? ` — ${message}` : ''}`)
    }

    this.registry
      .route(task, progressFn)
      .then((result) => {
        this.pendingResults.push({ id: task.id, status: 'done', result })
      })
      .catch((err) => {
        this.pendingResults.push({
          id: task.id,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          retryable: true,
        })
      })
      .finally(() => {
        this.activeTasks.delete(task.id)
      })
  }

  private async submitPartialResults(): Promise<void> {
    if (this.pendingResults.length === 0) return
    await this.submitResults()
  }

  private async submitResults(): Promise<void> {
    if (this.pendingResults.length === 0) return

    const results = this.pendingResults.splice(0)
    const done = results
      .filter((r) => r.status === 'done')
      .map((r) => ({ id: r.id, result: r.result! }))
    const failed = results
      .filter((r) => r.status === 'failed')
      .map((r) => ({ id: r.id, error: r.error!, retryable: r.retryable ?? true }))

    try {
      await this.tokenManager.withRetry(async (token) => {
        const res = await fetch(`${this.config.hubUrl}/tasks/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ done, failed }),
        })

        if (res.status === 401) {
          const err = new Error('Unauthorized') as any
          err.status = 401
          throw err
        }

        if (!res.ok) {
          throw new Error(`Complete failed: ${res.status}`)
        }
      })
      this.logger.debug(`Submitted ${done.length} done, ${failed.length} failed`)
    } catch (err) {
      this.logger.error('Failed to submit results', err)
      // Put them back for retry
      results.forEach((r) => this.pendingResults.push(r))
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
