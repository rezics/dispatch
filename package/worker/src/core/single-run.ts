import type { Task, TaskResult, Logger, ActiveTaskInfo } from '@rezics/dispatch-type'
import type { TokenManager } from './auth'
import type { PluginRegistry } from './registry'
import { ExternalResultSubmitter } from './external-result'

export interface SingleRunConfig {
  hubUrl: string
  concurrency: number
  shutdownTimeout: number
  heartbeatInterval: number
  timeout: number
  claimCount: number
  resultEndpoint?: string
}

export interface SingleRunResult {
  claimed: number
  completed: number
  failed: number
  abandoned: number
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

export class SingleRunManager {
  private config: SingleRunConfig
  private tokenManager: TokenManager
  private registry: PluginRegistry
  private logger: Logger
  private externalSubmitter: ExternalResultSubmitter | null

  private running = false
  private activeTaskControllers = new Map<string, AbortController>()
  private activeTaskMeta = new Map<string, { type: string; startedAt: Date; progress: number | null }>()
  private pendingResults: TaskOutcome[] = []
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _completedCount = 0
  private _failedCount = 0
  private consecutiveHeartbeatFailures = 0

  constructor(
    config: SingleRunConfig,
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

  async start(): Promise<SingleRunResult> {
    this.running = true
    this.logger.info('Starting single-run mode')

    // Claim tasks
    const tasks = await this.claim(this.config.claimCount)
    if (tasks.length === 0) {
      this.logger.info('No tasks available — exiting')
      this.running = false
      return { claimed: 0, completed: 0, failed: 0, abandoned: 0 }
    }

    this.logger.info(`Claimed ${tasks.length} tasks`)

    // Start heartbeat
    this.startHeartbeat()

    // Start timeout timer
    let timedOut = false
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        timedOut = true
        resolve()
      }, this.config.timeout)
    })

    // Execute tasks concurrently with concurrency limit
    const taskQueue = [...tasks]
    const executing = new Set<Promise<void>>()

    const runNext = async (): Promise<void> => {
      while (taskQueue.length > 0 && !timedOut) {
        const task = taskQueue.shift()!
        const promise = this.executeTask(task).then(() => {
          executing.delete(promise)
        })
        executing.add(promise)

        if (executing.size >= this.config.concurrency) {
          await Promise.race([...executing])
        }
      }
    }

    // Race between processing and timeout
    await Promise.race([
      runNext().then(() => Promise.all([...executing])).then(() => {}),
      timeoutPromise,
    ])

    // If timed out, wait for in-flight tasks up to shutdownTimeout
    if (timedOut && this.activeTaskControllers.size > 0) {
      this.logger.info(`Timeout reached — waiting up to ${this.config.shutdownTimeout}ms for ${this.activeTaskControllers.size} in-flight tasks`)
      const deadline = Date.now() + this.config.shutdownTimeout
      while (this.activeTaskControllers.size > 0 && Date.now() < deadline) {
        await sleep(200)
      }

      if (this.activeTaskControllers.size > 0) {
        this.logger.warn(`Shutdown timeout — abandoning ${this.activeTaskControllers.size} tasks`)
        for (const [, ctrl] of this.activeTaskControllers) {
          ctrl.abort()
        }
      }
    }

    // Stop heartbeat
    this.stopHeartbeat()

    // Submit remaining results
    await this.submitResults()

    this.running = false

    const result: SingleRunResult = {
      claimed: tasks.length,
      completed: this._completedCount,
      failed: this._failedCount,
      abandoned: tasks.length - this._completedCount - this._failedCount,
    }

    this.logger.info(`Single-run complete: ${result.completed} done, ${result.failed} failed, ${result.abandoned} abandoned`)
    return result
  }

  async stop(): Promise<void> {
    this.running = false
    this.stopHeartbeat()

    for (const [, ctrl] of this.activeTaskControllers) {
      ctrl.abort()
    }
    this.activeTaskControllers.clear()
    this.activeTaskMeta.clear()

    await this.submitResults()
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

  private executeTask(task: Task): Promise<void> {
    return new Promise<void>((resolve) => {
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
          resolve()
        })
    })
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
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
