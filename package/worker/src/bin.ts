import { createWorker, defineWorkerConfig } from './index'

const hubUrl = process.env.DISPATCH_HUB_URL
if (!hubUrl) {
  console.error('DISPATCH_HUB_URL environment variable is required')
  process.exit(1)
}

const getToken = async (): Promise<string> => {
  const token = process.env.DISPATCH_TOKEN
  if (!token) throw new Error('DISPATCH_TOKEN environment variable is required')
  return token
}

const config = defineWorkerConfig({
  hub: { url: hubUrl, getToken },
  mode: (process.env.DISPATCH_MODE as 'http' | 'ws') ?? 'http',
  concurrency: process.env.DISPATCH_CONCURRENCY ? Number(process.env.DISPATCH_CONCURRENCY) : undefined,
  pollInterval: process.env.DISPATCH_POLL_INTERVAL ? Number(process.env.DISPATCH_POLL_INTERVAL) : undefined,
  heartbeatInterval: process.env.DISPATCH_HEARTBEAT_INTERVAL ? Number(process.env.DISPATCH_HEARTBEAT_INTERVAL) : undefined,
})

const worker = createWorker(config)

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down...')
  await worker.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down...')
  await worker.stop()
  process.exit(0)
})

await worker.start()
