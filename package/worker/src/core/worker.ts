import type { Logger, WorkerStatus, ActiveTaskInfo } from '@rezics/dispatch-type'
import type { WorkerConfig } from './config'
import { TokenManager, AuthFatalError } from './auth'
import { PluginRegistry } from './registry'
import { LeaseManager } from './lease'
import { WsConnection } from './connection'
import { SingleRunManager } from './single-run'

const defaultLogger: Logger = {
  info: (msg, ...args) => console.log(`[dispatch-worker] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[dispatch-worker] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[dispatch-worker] ${msg}`, ...args),
  debug: () => {},
}

export interface Worker {
  start(): Promise<void>
  stop(): Promise<void>
  capabilities(): string[]
  status(): WorkerStatus
  activeTasks(): ActiveTaskInfo[]
}

export function createWorker(config: WorkerConfig): Worker {
  const logger = config.logger ?? defaultLogger
  const tokenManager = new TokenManager(config.hub.getToken, logger)
  const registry = new PluginRegistry(logger)

  // Register all plugins
  for (const { plugin, config: pluginConfig } of config.plugins) {
    registry.register(plugin, pluginConfig)
  }

  let mode: LeaseManager | WsConnection | SingleRunManager | null = null
  let startedAt: number | null = null

  return {
    async start() {
      startedAt = Date.now()

      // Initialize token
      await tokenManager.init()

      // Load all plugins
      await registry.loadAll()

      // Create mode-specific manager
      if (config.mode === 'ws') {
        mode = new WsConnection(
          {
            hubUrl: config.hub.url,
            concurrency: config.concurrency,
            resultEndpoint: config.hub.resultEndpoint,
          },
          tokenManager,
          registry,
          logger,
        )
      } else if (config.mode === 'single-run') {
        mode = new SingleRunManager(
          {
            hubUrl: config.hub.url,
            concurrency: config.concurrency,
            shutdownTimeout: config.shutdownTimeout,
            heartbeatInterval: config.heartbeatInterval,
            timeout: config.timeout!,
            claimCount: config.claimCount ?? config.concurrency,
            resultEndpoint: config.hub.resultEndpoint,
          },
          tokenManager,
          registry,
          logger,
        )
      } else {
        mode = new LeaseManager(
          {
            hubUrl: config.hub.url,
            concurrency: config.concurrency,
            pollInterval: config.pollInterval,
            shutdownTimeout: config.shutdownTimeout,
            heartbeatInterval: config.heartbeatInterval,
            resultEndpoint: config.hub.resultEndpoint,
          },
          tokenManager,
          registry,
          logger,
        )
      }

      await mode.start()
    },

    async stop() {
      if (mode) {
        await mode.stop()
        mode = null
      }

      await registry.unloadAll()
      tokenManager.destroy()
    },

    capabilities() {
      return registry.getCapabilities()
    },

    status(): WorkerStatus {
      return {
        mode: config.mode as 'http' | 'ws' | 'single-run',
        connected: mode !== null && mode.isRunning,
        uptime: startedAt ? Date.now() - startedAt : 0,
        counts: mode
          ? {
              active: mode.activeCount,
              completed: (mode instanceof LeaseManager || mode instanceof SingleRunManager) ? mode.completedCount : 0,
              failed: (mode instanceof LeaseManager || mode instanceof SingleRunManager) ? mode.failedCount : 0,
            }
          : { active: 0, completed: 0, failed: 0 },
      }
    },

    activeTasks(): ActiveTaskInfo[] {
      if (!mode) return []
      return mode.getActiveTasks()
    },
  }
}
