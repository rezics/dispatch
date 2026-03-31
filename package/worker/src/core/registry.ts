import type { DispatchPlugin, PluginContext, PluginHandler, Logger, Task, TaskResult } from '@rezics/dispatch-type'

export interface RegisteredPlugin {
  plugin: DispatchPlugin<any>
  config: unknown
}

export class PluginRegistry {
  private plugins: RegisteredPlugin[] = []
  private capabilityMap = new Map<string, { handler: PluginHandler<any>; plugin: DispatchPlugin<any> }>()
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  register(plugin: DispatchPlugin<any>, config: unknown): void {
    // Check for capability collisions
    for (const cap of plugin.capabilities) {
      const existing = this.capabilityMap.get(cap)
      if (existing) {
        throw new Error(
          `Capability collision: "${cap}" is declared by both "${existing.plugin.name}" and "${plugin.name}"`,
        )
      }
    }

    // Register all capabilities
    for (const cap of plugin.capabilities) {
      const handler = plugin.handlers[cap]
      if (!handler) {
        throw new Error(`Plugin "${plugin.name}" declares capability "${cap}" but has no handler for it`)
      }
      this.capabilityMap.set(cap, { handler, plugin })
    }

    this.plugins.push({ plugin, config })
  }

  getCapabilities(): string[] {
    return Array.from(this.capabilityMap.keys())
  }

  hasHandler(taskType: string): boolean {
    return this.capabilityMap.has(taskType)
  }

  async route(
    task: Task,
    progressFn: (percent: number, message?: string) => Promise<void>,
  ): Promise<TaskResult> {
    const entry = this.capabilityMap.get(task.type)
    if (!entry) {
      throw new Error(`No handler found for task type "${task.type}"`)
    }

    const pluginEntry = this.plugins.find((p) => p.plugin === entry.plugin)!
    const ctx: PluginContext<any> = {
      config: pluginEntry.config,
      logger: this.createScopedLogger(entry.plugin.name),
      progress: progressFn,
    }

    return entry.handler(task, ctx)
  }

  async loadAll(): Promise<void> {
    for (const { plugin, config } of this.plugins) {
      if (plugin.onLoad) {
        const ctx: PluginContext<any> = {
          config,
          logger: this.createScopedLogger(plugin.name),
          progress: async () => {},
        }
        await plugin.onLoad(ctx)
      }
    }
  }

  async unloadAll(): Promise<void> {
    for (let i = this.plugins.length - 1; i >= 0; i--) {
      const { plugin, config } = this.plugins[i]
      if (plugin.onUnload) {
        const ctx: PluginContext<any> = {
          config,
          logger: this.createScopedLogger(plugin.name),
          progress: async () => {},
        }
        await plugin.onUnload(ctx)
      }
    }
  }

  private createScopedLogger(name: string): Logger {
    return {
      info: (msg, ...args) => this.logger.info(`[${name}] ${msg}`, ...args),
      warn: (msg, ...args) => this.logger.warn(`[${name}] ${msg}`, ...args),
      error: (msg, ...args) => this.logger.error(`[${name}] ${msg}`, ...args),
      debug: (msg, ...args) => this.logger.debug(`[${name}] ${msg}`, ...args),
    }
  }
}
