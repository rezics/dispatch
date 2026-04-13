import type { Task, TaskResult, HubMessage, WorkerMessage, Logger, ActiveTaskInfo } from '@rezics/dispatch-type'
import type { TokenManager } from './auth'
import type { PluginRegistry } from './registry'

export interface ConnectionConfig {
  hubUrl: string
  concurrency: number
}

export class WsConnection {
  private config: ConnectionConfig
  private tokenManager: TokenManager
  private registry: PluginRegistry
  private logger: Logger

  private ws: WebSocket | null = null
  private running = false
  private reconnectAttempt = 0
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private activeTasks = new Map<string, AbortController>()
  private activeTaskMeta = new Map<string, { type: string; startedAt: Date; progress: number | null }>()

  constructor(
    config: ConnectionConfig,
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
    this.logger.info('Starting WebSocket mode')
    await this.connect()
  }

  async stop(): Promise<void> {
    this.running = false
    this.stopHeartbeat()

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // Abort all active tasks
    for (const [, ctrl] of this.activeTasks) {
      ctrl.abort()
    }
    this.activeTasks.clear()

    if (this.ws) {
      this.ws.close(1000, 'Worker shutting down')
      this.ws = null
    }

    this.logger.info('WebSocket mode stopped')
  }

  private async connect(): Promise<void> {
    const token = this.tokenManager.current()
    const url = `${this.config.hubUrl}/workers`

    try {
      this.ws = new WebSocket(url, {
        headers: { Authorization: `Bearer ${token}` },
      } as any)

      this.ws.onopen = () => {
        this.logger.info('WebSocket connected')
        this.reconnectAttempt = 0
        this.sendRegister()
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      this.ws.onclose = (event) => {
        this.logger.warn(`WebSocket closed: ${event.code} ${event.reason}`)
        this.stopHeartbeat()
        if (this.running) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (event) => {
        this.logger.error('WebSocket error', event)
      }
    } catch (err) {
      this.logger.error('Failed to connect', err)
      if (this.running) {
        this.scheduleReconnect()
      }
    }
  }

  private sendRegister(): void {
    this.send({
      type: 'register',
      capabilities: this.registry.getCapabilities(),
      concurrency: this.config.concurrency,
    })
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const activeTaskIds = Array.from(this.activeTasks.keys())
      this.send({ type: 'heartbeat' })
    }, 15_000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private handleMessage(raw: string | Buffer): void {
    try {
      const data = typeof raw === 'string' ? raw : raw.toString()
      const msg = JSON.parse(data) as HubMessage

      switch (msg.type) {
        case 'task:dispatch':
          this.handleTaskDispatch(msg.task)
          break
        case 'task:cancel':
          this.handleTaskCancel(msg.taskId)
          break
        case 'ping':
          // Bun handles WebSocket pong at protocol level
          break
        case 'config:update':
          this.logger.debug('Config update received', msg.config)
          break
      }
    } catch (err) {
      this.logger.error('Failed to parse message', err)
    }
  }

  private handleTaskDispatch(task: Task): void {
    const controller = new AbortController()
    this.activeTasks.set(task.id, controller)
    this.activeTaskMeta.set(task.id, { type: task.type, startedAt: new Date(), progress: null })

    const progressFn = async (percent: number, message?: string) => {
      const meta = this.activeTaskMeta.get(task.id)
      if (meta) meta.progress = percent
      this.send({
        type: 'task:progress',
        taskId: task.id,
        percent,
        message,
      } as WorkerMessage)
    }

    this.registry
      .route(task, progressFn)
      .then((result) => {
        this.send({
          type: 'task:done',
          taskId: task.id,
          result,
        })
      })
      .catch((err) => {
        this.send({
          type: 'task:fail',
          taskId: task.id,
          error: err instanceof Error ? err.message : String(err),
          retryable: true,
        })
      })
      .finally(() => {
        this.activeTasks.delete(task.id)
        this.activeTaskMeta.delete(task.id)
      })
  }

  private handleTaskCancel(taskId: string): void {
    const controller = this.activeTasks.get(taskId)
    if (controller) {
      controller.abort()
      this.activeTasks.delete(taskId)
      this.activeTaskMeta.delete(taskId)
      this.send({
        type: 'task:fail',
        taskId,
        error: 'cancelled',
        retryable: false,
      })
    }
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt + Math.random() * 1000, 30_000)
    this.reconnectAttempt++
    this.logger.info(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempt})`)

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.tokenManager.refresh()
      } catch {
        // Token refresh failure is non-fatal for reconnect
      }
      this.connect()
    }, delay)
  }

  private send(msg: WorkerMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }
}
