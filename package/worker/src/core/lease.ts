import type { Task, TaskResult, Logger, ActiveTaskInfo } from '@rezics/dispatch-type'
import type { TokenManager } from './auth'
import type { PluginRegistry } from './registry'
import { ExternalResultSubmitter } from './external-result'

export interface LeaseConfig {
  hubUrl: string
  concurrency: number
  pollInterval: number
  shutdownTimeout: number
  heartbeatInterval: number
  resultEndpoint?: string
}

interface TaskOutcome {
  id: string
  project?: string
  type?: string
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
  private externalSubmitter: ExternalResultSubmitter | null

  private running = false
  private shuttingDown = false
  private activeTaskControllers = new Map<string, AbortController>()
  private activeTaskMeta = new Map<string, { type: string; startedAt: Date; progress: number | null }>()
  private pendingResults: TaskOutcome[] = []
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private partialSubmitTimer: ReturnType<typeof setInterval> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _completedCount = 0
  private _failedCount = 0
  private consecutiveHeartbeatFailures = 0

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
    this.externalSubmitter = config.resultEndpoint
      ? new ExternalResultSubmitter(config.resultEndpoint, tokenManager, logger)
      : null
  }

  get activeCount(): number {
    return this.activeTaskControllers.size
  }

  get completedCount(): number {
    return this._completedCount
  }

  get failedCount(): number {
    return this._failedCount
  }

  get isRunning(): boolean {
    return this.running
  }

  getActiveTasks(): ActiveTaskInfo[] {
    return Array.from(this.activeTaskMeta.entries()).map(([taskId, meta]) => ({
      taskId,
      type: meta.type,
      startedAt: meta.startedAt,
      progress: meta.progress,
    }))
  }

  async start(): Promise<void> {
    this.running = true
    this.logger.info('Starting HTTP Lease mode')

    // Start partial completion timer (every 10s)
    this.partialSubmitTimer = setInterval(() => this.submitPartialResults(), 10_000)
    if (this.partialSubmitTimer && typeof this.partialSubmitTimer === 'object' && 'unref' in this.partialSubmitTimer) {
      this.partialSubmitTimer.unref()
    }

    // Start worker-level heartbeat
    this.startHeartbeat()

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
    this.stopHeartbeat()

    // Wait for in-flight tasks up to shutdownTimeout
    const deadline = Date.now() + this.config.shutdownTimeout
    while (this.activeTaskControllers.size > 0 && Date.now() < deadline) {
      await sleep(200)
    }

    if (this.activeTaskControllers.size > 0) {
      this.logger.warn(`Shutdown timeout — ${this.activeTaskControllers.size} tasks still running`)
      // Abort remaining tasks
      for (const [, ctrl] of this.activeTaskControllers) {
        ctrl.abort()
      }
    }

    // Submit any remaining results
    await this.submitResults()
    this.logger.info('HTTP Lease mode stopped')
  }

  private async pollLoop(): Promise<void> {
    while (this.running && !this.shuttingDown) {
      const remaining = this.config.concurrency - this.activeTaskControllers.size
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
        body: JSON.stringify({ count, lease: `${Math.ceil(this.config.heartbeatInterval * 3 / 1000)}s` }),
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

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private async sendHeartbeat(): Promise<void> {
    if (this.activeTaskControllers.size === 0) return

    try {
      await this.tokenManager.withRetry(async (token) => {
        const res = await fetch(`${this.config.hubUrl}/workers/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ workerId: this.tokenManager.workerId() }),
        })

        if (res.status === 401) {
          const err = new Error('Unauthorized') as any
          err.status = 401
          throw err
        }

        if (!res.ok) {
          throw new Error(`Heartbeat failed: ${res.status}`)
        }
      })
      this.consecutiveHeartbeatFailures = 0
    } catch (err) {
      this.consecutiveHeartbeatFailures++
      if (this.consecutiveHeartbeatFailures >= 3) {
        this.logger.error('Heartbeat failed for 3+ consecutive intervals — task leases are likely expired', err)
      } else {
        this.logger.warn('Heartbeat failed, will retry next interval', err)
      }
    }
  }

  private executeTask(task: Task): void {
    const controller = new AbortController()
    this.activeTaskControllers.set(task.id, controller)
    this.activeTaskMeta.set(task.id, { type: task.type, startedAt: new Date(), progress: null })

    const progressFn = async (percent: number, message?: string) => {
      const meta = this.activeTaskMeta.get(task.id)
      if (meta) meta.progress = percent
      this.logger.debug(`Task ${task.id} progress: ${percent}%${message ? ` — ${message}` : ''}`)
    }

    this.registry
      .route(task, progressFn)
      .then((result) => {
        this.pendingResults.push({ id: task.id, project: task.project, type: task.type, status: 'done', result })
        this._completedCount++
      })
      .catch((err) => {
        this.pendingResults.push({
          id: task.id,
          project: task.project,
          type: task.type,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          retryable: true,
        })
        this._failedCount++
      })
      .finally(() => {
        this.activeTaskControllers.delete(task.id)
        this.activeTaskMeta.delete(task.id)
      })
  }

  private async submitPartialResults(): Promise<void> {
    if (this.pendingResults.length === 0) return
    await this.submitResults()
  }

  private async submitResults(): Promise<void> {
    if (this.pendingResults.length === 0) return

    const results = this.pendingResults.splice(0)

    if (this.externalSubmitter) {
      const done = results
        .filter((r) => r.status === 'done')
        .map((r) => ({ taskId: r.id, project: r.project!, type: r.type!, data: r.result! }))
      const failed = results
        .filter((r) => r.status === 'failed')
        .map((r) => ({ taskId: r.id, error: r.error!, retryable: r.retryable ?? true }))

      try {
        await this.externalSubmitter.submitBatch(done, failed)
      } catch (err) {
        this.logger.error('Failed to submit external results', err)
        results.forEach((r) => this.pendingResults.push(r))
      }
      return
    }

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
      results.forEach((r) => this.pendingResults.push(r))
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
