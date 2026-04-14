import { parseArgs } from 'util'
import { loadConfig } from '../config'

export async function statusCommand(args: string[]) {
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
    const res = await fetch(`http://localhost:${port}/api/status`)
    const status = await res.json() as {
      mode: string
      connected: boolean
      uptime: number
      hubUrl: string
      counts: { active: number; completed: number; failed: number }
    }

    const uptime = Math.floor(status.uptime / 1000)
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = uptime % 60

    console.log('Worker Status')
    console.log(`  Mode:       ${status.mode}`)
    console.log(`  Connected:  ${status.connected ? 'yes' : 'no'}`)
    console.log(`  Uptime:     ${hours}h ${minutes}m ${seconds}s`)
    console.log(`  Hub:        ${status.hubUrl}`)
    console.log(`  Active:     ${status.counts.active}`)
    console.log(`  Completed:  ${status.counts.completed}`)
    console.log(`  Failed:     ${status.counts.failed}`)
  } catch {
    console.error(`Could not connect to Rezics worker on port ${port}`)
    process.exit(1)
  }
}
