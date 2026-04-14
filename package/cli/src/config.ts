import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { parse as parseTOML } from 'smol-toml'
import { z } from 'zod'

const configSchema = z
  .object({
    hub: z
      .object({
        url: z.string().default(''),
        token: z.string().default(''),
      })
      .default({}),
    worker: z
      .object({
        mode: z.enum(['http', 'ws']).default('http'),
        concurrency: z.number().int().min(1).default(10),
        poll_interval: z.number().int().min(1000).default(5000),
        heartbeat_interval: z.number().int().min(5000).default(60000),
        shutdown_timeout: z.number().int().min(0).default(30000),
      })
      .default({}),
    dashboard: z
      .object({
        port: z.number().int().min(1).max(65535).default(45321),
      })
      .default({}),
    crawler: z
      .object({
        book: z
          .object({
            rate_limit: z.number().default(10),
            sources: z.array(z.enum(['qidian', 'jjwxc', 'novel'])).default(['qidian']),
            proxy: z.string().optional(),
          })
          .default({}),
        anime: z
          .object({
            sources: z.array(z.enum(['mal', 'anilist'])).default(['mal']),
            mal_api_key: z.string().optional(),
            anilist_token: z.string().optional(),
          })
          .default({}),
      })
      .default({}),
  })
  .passthrough()

export type RezicsConfig = z.infer<typeof configSchema>

export interface CLIFlags {
  config?: string
  port?: number
  mode?: 'http' | 'ws'
  concurrency?: number
}

// Config file path resolution: --config flag → REZICS_CONFIG env → ~/.rezics/config.toml → ./rezics.toml
function resolveConfigPath(flagPath?: string): string | null {
  if (flagPath) {
    if (!existsSync(flagPath)) {
      console.error(`Config file not found: ${flagPath}`)
      process.exit(1)
    }
    return flagPath
  }

  const envPath = process.env.REZICS_CONFIG
  if (envPath) {
    if (!existsSync(envPath)) {
      console.error(`Config file not found (from REZICS_CONFIG): ${envPath}`)
      process.exit(1)
    }
    return envPath
  }

  const homePath = join(homedir(), '.rezics', 'config.toml')
  if (existsSync(homePath)) return homePath

  const localPath = join(process.cwd(), 'rezics.toml')
  if (existsSync(localPath)) return localPath

  return null
}

function loadConfigFile(path: string | null): Record<string, unknown> {
  if (!path) return {}
  try {
    const content = readFileSync(path, 'utf-8')
    return parseTOML(content) as Record<string, unknown>
  } catch (err) {
    if (err instanceof Error && err.message.includes('Expected')) {
      console.error(`Invalid TOML in ${path}: ${err.message}`)
      process.exit(1)
    }
    throw err
  }
}

// Env var overlay: REZICS_ prefix, with DISPATCH_ legacy aliases
function applyEnvOverlay(config: Record<string, unknown>): Record<string, unknown> {
  const result = structuredClone(config)

  const env = (rezicsKey: string, dispatchKey?: string): string | undefined =>
    process.env[rezicsKey] ?? (dispatchKey ? process.env[dispatchKey] : undefined)

  const hubUrl = env('REZICS_HUB_URL', 'DISPATCH_HUB_URL')
  const hubToken = env('REZICS_HUB_TOKEN', 'DISPATCH_TOKEN')
  const workerMode = env('REZICS_WORKER_MODE', 'DISPATCH_MODE')
  const workerConcurrency = env('REZICS_WORKER_CONCURRENCY', 'DISPATCH_CONCURRENCY')
  const dashboardPort = env('REZICS_DASHBOARD_PORT')
  const pollInterval = env('REZICS_WORKER_POLL_INTERVAL', 'DISPATCH_POLL_INTERVAL')
  const heartbeatInterval = env('REZICS_WORKER_HEARTBEAT_INTERVAL', 'DISPATCH_HEARTBEAT_INTERVAL')

  if (!result.hub) result.hub = {}
  const hub = result.hub as Record<string, unknown>
  if (hubUrl) hub.url = hubUrl
  if (hubToken) hub.token = hubToken

  if (!result.worker) result.worker = {}
  const worker = result.worker as Record<string, unknown>
  if (workerMode) worker.mode = workerMode
  if (workerConcurrency) worker.concurrency = Number(workerConcurrency)
  if (pollInterval) worker.poll_interval = Number(pollInterval)
  if (heartbeatInterval) worker.heartbeat_interval = Number(heartbeatInterval)

  if (!result.dashboard) result.dashboard = {}
  const dashboard = result.dashboard as Record<string, unknown>
  if (dashboardPort) dashboard.port = Number(dashboardPort)

  return result
}

// CLI flag override merging
function applyFlagOverrides(
  config: Record<string, unknown>,
  flags: CLIFlags,
): Record<string, unknown> {
  const result = structuredClone(config)

  if (flags.port !== undefined) {
    if (!result.dashboard) result.dashboard = {}
    ;(result.dashboard as Record<string, unknown>).port = flags.port
  }

  if (flags.mode !== undefined) {
    if (!result.worker) result.worker = {}
    ;(result.worker as Record<string, unknown>).mode = flags.mode
  }

  if (flags.concurrency !== undefined) {
    if (!result.worker) result.worker = {}
    ;(result.worker as Record<string, unknown>).concurrency = flags.concurrency
  }

  return result
}

const SECRET_KEYS = new Set(['token', 'mal_api_key', 'anilist_token', 'proxy'])

export function redactSecrets(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj
  if (Array.isArray(obj)) return obj.map(redactSecrets)

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key) && typeof value === 'string' && value.length > 0) {
      result[key] = '***'
    } else {
      result[key] = redactSecrets(value)
    }
  }
  return result
}

export interface LoadConfigResult {
  config: RezicsConfig
  configPath: string | null
}

export function loadConfig(flags: CLIFlags): LoadConfigResult {
  const configPath = resolveConfigPath(flags.config)
  let raw = loadConfigFile(configPath)
  raw = applyEnvOverlay(raw)
  raw = applyFlagOverrides(raw, flags)

  const result = configSchema.safeParse(raw)
  if (!result.success) {
    for (const issue of result.error.issues) {
      console.error(`Config error: ${issue.path.join('.')}: ${issue.message}`)
    }
    process.exit(1)
  }

  return { config: result.data, configPath }
}

export function validateConfigForStart(config: RezicsConfig): void {
  const errors: string[] = []

  if (!config.hub.url) {
    errors.push('hub.url is required')
  } else {
    try {
      new URL(config.hub.url)
    } catch {
      errors.push('hub.url must be a valid URL')
    }
  }

  if (!config.hub.token) {
    errors.push('hub.token is required')
  }

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`Config error: ${err}`)
    }
    process.exit(1)
  }
}

export const CONFIG_SEARCH_PATHS = [
  '~/.rezics/config.toml',
  './rezics.toml',
]
