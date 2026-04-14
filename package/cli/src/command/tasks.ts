import { parseArgs } from 'util'
import { loadConfig } from '../config'

export async function tasksCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      port: { type: 'string' },
      config: { type: 'string' },
    },
    allowPositionals: false,
  })

  const { config } = loadConfig({ config: values.config })
  const port = values.port ? Number(values.port) : config.dashboard.port

  try {
    const res = await fetch(`http://localhost:${port}/api/tasks`)
    const data = await res.json() as {
      active: Array<{
        taskId: string
        type: string
        startedAt: string
        progress?: { percent: number; message: string }
      }>
      counts: { active: number; completed: number; failed: number }
    }

    if (data.active.length === 0) {
      console.log('No active tasks')
      return
    }

    console.log(`Active tasks (${data.active.length}):`)
    console.log()

    for (const task of data.active) {
      const started = new Date(task.startedAt)
      const duration = Math.floor((Date.now() - started.getTime()) / 1000)
      const progress = task.progress ? `${task.progress.percent}% - ${task.progress.message}` : '-'

      console.log(`  ${task.taskId}`)
      console.log(`    Type:     ${task.type}`)
      console.log(`    Duration: ${duration}s`)
      console.log(`    Progress: ${progress}`)
      console.log()
    }

    console.log(`Totals: ${data.counts.active} active, ${data.counts.completed} completed, ${data.counts.failed} failed`)
  } catch {
    console.error(`Could not connect to Rezics worker on port ${port}`)
    process.exit(1)
  }
}
