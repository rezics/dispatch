export type TaskStatus = 'pending' | 'running' | 'done' | 'failed'

export interface Task {
  id: string
  project: string
  type: string
  payload: unknown
  priority: number
  status: TaskStatus
  workerId: string | null
  attempts: number
  maxAttempts: number
  scheduledAt: Date
  startedAt: Date | null
  leaseExpiresAt: Date | null
  finishedAt: Date | null
  error: string | null
  createdAt: Date
}

export type TaskResult =
  | { strategy: 'discard' }
  | { strategy: 'store'; data: unknown }
  | { strategy: 'webhook'; url: string; data: unknown; headers?: Record<string, string> }
  | { strategy: 'custom'; plugin: string; data: unknown }
