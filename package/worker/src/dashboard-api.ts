import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import type { WorkerConfig } from './core/config'
import type { PluginRegistry } from './core/registry'

interface DashboardApiOptions {
  config: WorkerConfig
  registry: PluginRegistry
  port?: number
  getActiveTasks: () => Array<{
    id: string
    type: string
    status: string
    progress?: { percent: number; message?: string }
    startedAt: string
  }>
  getTaskHistory: () => Array<{
    id: string
    type: string
    status: string
    startedAt: string
    finishedAt: string
    error?: string | null
  }>
  getConnectionState: () => 'connected' | 'disconnected' | 'reconnecting'
  getUptime: () => number
}

function redactSecrets(obj: unknown): unknown {
  if (typeof obj === 'string') {
    // Redact URLs with credentials
    if (obj.match(/\/\/[^@]+@/)) {
      return obj.replace(/\/\/([^@]+)@/, '//***@')
    }
    // Redact anything that looks like a key/token
    if (obj.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(obj)) {
      return '***'
    }
    return obj
  }
  if (Array.isArray(obj)) return obj.map(redactSecrets)
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (/secret|token|key|password|credential/i.test(key)) {
        result[key] = '***'
      } else {
        result[key] = redactSecrets(value)
      }
    }
    return result
  }
  return obj
}

export function createDashboardApi(options: DashboardApiOptions) {
  const { config, registry, port = 45321 } = options

  const app = new Elysia()
    .use(cors())
    .get('/status', () => ({
      hubUrl: config.hub.url,
      mode: config.mode,
      connectionState: options.getConnectionState(),
      uptime: options.getUptime(),
      activeTasks: options.getActiveTasks().length,
      completedTasks: options.getTaskHistory().filter((t) => t.status === 'done').length,
      failedTasks: options.getTaskHistory().filter((t) => t.status === 'failed').length,
    }))
    .get('/tasks', () => ({
      active: options.getActiveTasks(),
      history: options.getTaskHistory(),
    }))
    .get('/config', () => ({
      concurrency: config.concurrency,
      mode: config.mode,
      plugins: registry.getPlugins().map((p) => ({
        name: p.name,
        version: p.version,
        capabilities: p.capabilities,
        displayName: p.displayName,
      })),
      configValues: redactSecrets(
        Object.fromEntries(
          config.plugins.map((p) => [p.plugin.name, p.config]),
        ),
      ),
    }))
    .listen(port)

  return app
}
