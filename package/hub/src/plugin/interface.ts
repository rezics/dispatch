import type { TaskResult } from '@rezics/dispatch-type'

export interface ResultPluginTask {
  id: string
  project: string
  type: string
}

export interface ResultPlugin {
  id: string
  handle(task: ResultPluginTask, result: TaskResult, config?: unknown): Promise<void>
}
