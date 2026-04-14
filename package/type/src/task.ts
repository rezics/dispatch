export type TaskStatus = 'pending' | 'running' | 'done' | 'failed'

export interface Task {
  id: string
  project: string
  type: string
  payload: unknown
  /** Effective priority (may be increased by aging). Range: 0–1000. */
  priority: number
  /** Original priority set at creation. Range: 0–1000. Reset target on recurrence. */
  basePriority: number
  status: TaskStatus
  workerId: string | null
  attempts: number
  maxAttempts: number
  scheduledAt: Date
  startedAt: Date | null
  leaseExpiresAt: Date | null
  maxHoldExpiresAt: Date | null
  finishedAt: Date | null
  error: string | null
  /** Recurrence interval in seconds. Null for one-shot tasks. */
  recurrenceInterval: number | null
  /** Max random jitter in seconds added to recurrence interval. */
  recurrenceJitter: number | null
  createdAt: Date
}

export type TaskResult =
  | { strategy: 'discard' }
  | { strategy: 'store'; data: unknown }
  | { strategy: 'webhook'; url: string; data: unknown; headers?: Record<string, string> }
  | { strategy: 'custom'; plugin: string; data: unknown }
