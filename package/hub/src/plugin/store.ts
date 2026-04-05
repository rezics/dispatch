import type { PrismaClient } from '#/prisma/client'
import type { TaskResult } from '@rezics/dispatch-type'
import type { ResultPlugin, ResultPluginTask } from './interface'

export function createStorePlugin(db: PrismaClient): ResultPlugin {
  return {
    id: 'store',
    async handle(task: ResultPluginTask, result: TaskResult) {
      if (result.strategy !== 'store' || !('data' in result)) return

      await db.taskResult.upsert({
        where: { taskId: task.id },
        create: { taskId: task.id, data: result.data ?? {} },
        update: { data: result.data ?? {} },
      })
    },
  }
}
