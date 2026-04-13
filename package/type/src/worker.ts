export interface SingleRunConfig {
  timeout: number
  claimCount?: number
}

export interface WorkerStatus {
  mode: 'http' | 'ws' | 'single-run'
  connected: boolean
  uptime: number
  counts: {
    active: number
    completed: number
    failed: number
  }
}

export interface ActiveTaskInfo {
  taskId: string
  type: string
  startedAt: Date
  progress: number | null
}
