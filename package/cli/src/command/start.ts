import { parseArgs } from 'util'
import { loadConfig, validateConfigForStart } from '../config'
import { ensureAuthToken } from '../auth'
import { createRezicsWorker } from '../worker'
import { createServer } from '../server'

export async function startCommand(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      port: { type: 'string' },
      mode: { type: 'string' },
      concurrency: { type: 'string' },
      config: { type: 'string' },
    },
    allowPositionals: false,
  })

  const { config } = loadConfig({
    config: values.config,
    port: values.port ? Number(values.port) : undefined,
    mode: values.mode as 'http' | 'ws' | undefined,
    concurrency: values.concurrency ? Number(values.concurrency) : undefined,
  })

  validateConfigForStart(config)

  await ensureAuthToken(config)

  const worker = createRezicsWorker(config)
  const server = createServer(worker, config)

  // Signal handling for graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...')
    await worker.stop()
    server.stop()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Start server and worker
  server.start()
  await worker.start()

  console.log(`Rezics worker running on http://localhost:${server.port}`)
  console.log(`  Mode: ${config.worker.mode}`)
  console.log(`  Concurrency: ${config.worker.concurrency}`)
  console.log(`  Hub: ${config.hub.url}`)
  console.log(`  Capabilities: ${worker.capabilities().join(', ')}`)
}
