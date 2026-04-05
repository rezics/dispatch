import type { PrismaClient } from '#/prisma/client'
import type { WorkerMessage, HubMessage, Task, TaskResult } from '@rezics/dispatch-type'

export interface ConnectedWorker {
  id: string
  project: string
  capabilities: string[]
  concurrency: number
  activeTaskCount: number
  ws: { send(data: string): void; close(): void }
  lastSeen: Date
  heartbeatTimeout: ReturnType<typeof setTimeout> | null
}

const HEARTBEAT_TIMEOUT_MS = 30_000

export class WsManager {
  private workers = new Map<string, ConnectedWorker>()
  private db: PrismaClient
  private taskProgress = new Map<string, { percent: number; message?: string }>()

  constructor(db: PrismaClient) {
    this.db = db
  }

  getWorker(id: string): ConnectedWorker | undefined {
    return this.workers.get(id)
  }

  getProgress(taskId: string): { percent: number; message?: string } | undefined {
    return this.taskProgress.get(taskId)
  }

  async register(
    workerId: string,
    project: string,
    ws: { send(data: string): void; close(): void },
    capabilities: string[],
    concurrency: number,
  ): Promise<void> {
    // Clean up any existing connection for this worker
    const existing = this.workers.get(workerId)
    if (existing?.heartbeatTimeout) {
      clearTimeout(existing.heartbeatTimeout)
    }

    const worker: ConnectedWorker = {
      id: workerId,
      project,
      capabilities,
      concurrency,
      activeTaskCount: 0,
      ws,
      lastSeen: new Date(),
      heartbeatTimeout: null,
    }

    this.workers.set(workerId, worker)
    this.resetHeartbeatTimeout(worker)

    // Upsert worker record in DB
    await this.db.worker.upsert({
      where: { id: workerId },
      create: {
        id: workerId,
        project,
        capabilities,
        concurrency,
        mode: 'ws',
        connectedAt: new Date(),
        lastSeen: new Date(),
      },
      update: {
        capabilities,
        concurrency,
        mode: 'ws',
        lastSeen: new Date(),
      },
    })
  }

  async handleMessage(workerId: string, msg: WorkerMessage): Promise<void> {
    const worker = this.workers.get(workerId)
    if (!worker) return

    switch (msg.type) {
      case 'heartbeat':
        worker.lastSeen = new Date()
        this.resetHeartbeatTimeout(worker)
        await this.db.worker.update({
          where: { id: workerId },
          data: { lastSeen: new Date() },
        })
        break

      case 'task:done':
        await this.handleTaskDone(worker, msg.taskId, msg.result)
        break

      case 'task:fail':
        await this.handleTaskFail(worker, msg.taskId, msg.error, msg.retryable)
        break

      case 'task:progress':
        this.taskProgress.set(msg.taskId, { percent: msg.percent, message: msg.message })
        break

      case 'register':
        // Re-register (e.g., after reconnect)
        worker.capabilities = msg.capabilities
        worker.concurrency = msg.concurrency
        break
    }
  }

  async dispatchTask(task: Task): Promise<boolean> {
    // Find a WS worker with matching capability and available concurrency
    for (const [, worker] of this.workers) {
      if (
        worker.project === task.project &&
        worker.capabilities.includes(task.type) &&
        worker.activeTaskCount < worker.concurrency
      ) {
        worker.activeTaskCount++
        const msg: HubMessage = { type: 'task:dispatch', task }
        worker.ws.send(JSON.stringify(msg))
        return true
      }
    }
    return false
  }

  sendCancel(taskId: string, workerId: string): void {
    const worker = this.workers.get(workerId)
    if (worker) {
      const msg: HubMessage = { type: 'task:cancel', taskId }
      worker.ws.send(JSON.stringify(msg))
    }
  }

  async disconnect(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId)
    if (worker) {
      if (worker.heartbeatTimeout) {
        clearTimeout(worker.heartbeatTimeout)
      }
      this.workers.delete(workerId)

      try {
        await this.db.worker.delete({ where: { id: workerId } })
      } catch {
        // Worker might already be deleted
      }
    }
  }

  private resetHeartbeatTimeout(worker: ConnectedWorker): void {
    if (worker.heartbeatTimeout) {
      clearTimeout(worker.heartbeatTimeout)
    }

    worker.heartbeatTimeout = setTimeout(async () => {
      console.warn(`[ws-manager] Worker ${worker.id} heartbeat timeout — disconnecting`)
      worker.ws.close()
      await this.disconnect(worker.id)
    }, HEARTBEAT_TIMEOUT_MS)

    // Don't keep process alive for heartbeat timeouts
    if (worker.heartbeatTimeout && typeof worker.heartbeatTimeout === 'object' && 'unref' in worker.heartbeatTimeout) {
      worker.heartbeatTimeout.unref()
    }
  }

  private async handleTaskDone(worker: ConnectedWorker, taskId: string, result: TaskResult): Promise<void> {
    worker.activeTaskCount = Math.max(0, worker.activeTaskCount - 1)
    this.taskProgress.delete(taskId)

    await this.db.task.update({
      where: { id: taskId },
      data: {
        status: 'done',
        finishedAt: new Date(),
        workerId: null,
        leaseExpiresAt: null,
      },
    })

    if (result.strategy === 'store' && 'data' in result) {
      await this.db.taskResult.upsert({
        where: { taskId },
        create: { taskId, data: result.data ?? {} },
        update: { data: result.data ?? {} },
      })
    }
  }

  private async handleTaskFail(
    worker: ConnectedWorker,
    taskId: string,
    error: string,
    retryable: boolean,
  ): Promise<void> {
    worker.activeTaskCount = Math.max(0, worker.activeTaskCount - 1)
    this.taskProgress.delete(taskId)

    const task = await this.db.task.findUnique({ where: { id: taskId } })
    if (!task) return

    if (retryable && task.attempts < task.maxAttempts) {
      await this.db.task.update({
        where: { id: taskId },
        data: {
          status: 'pending',
          workerId: null,
          leaseExpiresAt: null,
          startedAt: null,
        },
      })
    } else {
      await this.db.task.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          error,
          finishedAt: new Date(),
          workerId: null,
          leaseExpiresAt: null,
        },
      })
    }
  }
}
