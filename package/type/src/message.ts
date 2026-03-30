import type { Task, TaskResult } from './task'

export type WorkerMessage =
  | { type: 'register'; capabilities: string[]; concurrency: number }
  | { type: 'heartbeat' }
  | { type: 'task:done'; taskId: string; result: TaskResult }
  | { type: 'task:fail'; taskId: string; error: string; retryable: boolean }
  | { type: 'task:progress'; taskId: string; percent: number; message?: string }

export type HubMessage =
  | { type: 'task:dispatch'; task: Task }
  | { type: 'task:cancel'; taskId: string }
  | { type: 'config:update'; config: Record<string, unknown> }
  | { type: 'ping' }
