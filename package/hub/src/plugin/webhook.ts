import type { TaskResult } from '@rezics/dispatch-type'
import type { ResultPlugin, ResultPluginTask } from './interface'

export function createWebhookPlugin(): ResultPlugin {
  return {
    id: 'webhook',
    async handle(task: ResultPluginTask, result: TaskResult) {
      if (result.strategy !== 'webhook' || !('url' in result)) return

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...('headers' in result && result.headers ? result.headers : {}),
        }

        const res = await fetch(result.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(result.data),
        })

        if (!res.ok) {
          console.warn(
            `[webhook] Non-2xx response for task ${task.id}: ${res.status} ${await res.text().catch(() => '')}`,
          )
        }
      } catch (err) {
        console.warn(`[webhook] Failed for task ${task.id}:`, err)
      }
    },
  }
}
