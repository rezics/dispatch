import { z } from 'zod'
import type { DispatchPlugin, Logger } from '@rezics/dispatch-type'

const workerConfigSchema = z.object({
  hub: z.object({
    url: z.string().url('hub.url must be a valid URL'),
    getToken: z.custom<() => Promise<string>>((val) => typeof val === 'function'),
  }),
  mode: z.enum(['http', 'ws', 'single-run']).default('http'),
  concurrency: z.number().int().min(1).default(10),
  pollInterval: z.number().int().min(1000).default(5000),
  shutdownTimeout: z.number().int().min(0).default(30000),
  heartbeatInterval: z.number().int().min(5000).default(60000),
  plugin: z.array(z.tuple([z.any(), z.any()])).default([]),
  logger: z.custom<Logger>().optional(),
  // Single-run specific
  timeout: z.number().int().min(1000).optional(),
  claimCount: z.number().int().min(1).optional(),
}).refine(
  (data) => data.mode !== 'single-run' || data.timeout !== undefined,
  { message: 'timeout is required for single-run mode', path: ['timeout'] },
)

export type WorkerConfigInput = {
  hub: {
    url: string
    getToken: () => Promise<string>
  }
  mode?: 'http' | 'ws' | 'single-run'
  concurrency?: number
  pollInterval?: number
  shutdownTimeout?: number
  heartbeatInterval?: number
  plugin?: [DispatchPlugin<any>, unknown][]
  logger?: Logger
  timeout?: number
  claimCount?: number
}

export interface WorkerConfig {
  hub: {
    url: string
    getToken: () => Promise<string>
  }
  mode: 'http' | 'ws' | 'single-run'
  concurrency: number
  pollInterval: number
  shutdownTimeout: number
  heartbeatInterval: number
  plugins: Array<{ plugin: DispatchPlugin<any>; config: unknown }>
  logger?: Logger
  timeout?: number
  claimCount?: number
}

export function defineWorkerConfig(input: WorkerConfigInput): WorkerConfig {
  const parsed = workerConfigSchema.parse(input)

  // Validate each plugin's config against its Zod schema
  const plugins = (parsed.plugin as [DispatchPlugin<any>, unknown][]).map(([plugin, config]) => {
    const validated = plugin.config.parse(config)
    return { plugin, config: validated }
  })

  // Auto-convert https:// to wss:// when mode is ws
  let url = parsed.hub.url
  if (parsed.mode === 'ws') {
    if (url.startsWith('https://')) {
      url = `wss://${url.slice(8)}`
    } else if (url.startsWith('http://')) {
      url = `ws://${url.slice(7)}`
    }
  }

  return {
    hub: {
      url,
      getToken: parsed.hub.getToken as () => Promise<string>,
    },
    mode: parsed.mode as 'http' | 'ws' | 'single-run',
    concurrency: parsed.concurrency as number,
    pollInterval: parsed.pollInterval as number,
    shutdownTimeout: parsed.shutdownTimeout as number,
    heartbeatInterval: parsed.heartbeatInterval as number,
    plugins,
    logger: parsed.logger as Logger | undefined,
    timeout: parsed.timeout as number | undefined,
    claimCount: parsed.claimCount as number | undefined,
  }
}
