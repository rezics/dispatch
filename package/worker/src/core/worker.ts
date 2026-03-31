import type { Logger } from '@rezics/dispatch-type'
import type { WorkerConfig } from './config'
import { TokenManager, AuthFatalError } from './auth'
import { PluginRegistry } from './registry'
import { LeaseManager } from './lease'
import { WsConnection } from './connection'

const defaultLogger: Logger = {
  info: (msg, ...args) => console.log(`[dispatch-worker] ${msg}`, ...args),
  warn: (msg, ...args) => console.warn(`[dispatch-worker] ${msg}`, ...args),
  error: (msg, ...args) => console.error(`[dispatch-worker] ${msg}`, ...args),
  debug: (msg, ...args) => {
    if (process.env.DEBUG) console.debug(`[dispatch-worker] ${msg}`, ...args)
  },
}

export interface Worker {
  start(): Promise<void>
  stop(): Promise<void>
  capabilities(): string[]
}

export function createWorker(config: WorkerConfig): Worker {
  const logger = defaultLogger
  const tokenManager = new TokenManager(config.hub.getToken, logger)
  const registry = new PluginRegistry(logger)

  // Register all plugins
  for (const { plugin, config: pluginConfig } of config.plugins) {
    registry.register(plugin, pluginConfig)
  }

  let mode: LeaseManager | WsConnection | null = null
  let signalHandlerCleanup: (() => void) | null = null

  return {
    async start() {
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
          },
          tokenManager,
          registry,
          logger,
        )
      }

      // Set up graceful shutdown
      const shutdown = async () => {
        logger.info('Shutting down...')
        await this.stop()
        process.exit(0)
      }
      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)
      signalHandlerCleanup = () => {
        process.off('SIGINT', shutdown)
        process.off('SIGTERM', shutdown)
      }

      await mode.start()
    },

    async stop() {
      if (signalHandlerCleanup) {
        signalHandlerCleanup()
        signalHandlerCleanup = null
      }

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
  }
}
