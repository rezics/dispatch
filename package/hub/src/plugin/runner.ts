import type { PrismaClient } from '@prisma/client'
import type { TaskResult } from '@rezics/dispatch-type'
import type { ResultPlugin, ResultPluginTask } from './interface'
import { createStorePlugin } from './store'
import { createWebhookPlugin } from './webhook'
import { createDiscardPlugin } from './discard'

export class ResultPluginRunner {
  private plugins = new Map<string, ResultPlugin>()
  private db: PrismaClient

  constructor(db: PrismaClient, customPlugins: ResultPlugin[] = []) {
    this.db = db

    // Register built-in plugins
    const store = createStorePlugin(db)
    const webhook = createWebhookPlugin()
    const discard = createDiscardPlugin()

    this.plugins.set(store.id, store)
    this.plugins.set(webhook.id, webhook)
    this.plugins.set(discard.id, discard)

    // Register custom plugins
    for (const plugin of customPlugins) {
      this.plugins.set(plugin.id, plugin)
    }
  }

  async run(task: ResultPluginTask, result: TaskResult): Promise<void> {
    const strategy = result.strategy

    // For custom strategy, look up by plugin id
    const pluginId = strategy === 'custom' && 'plugin' in result ? result.plugin : strategy

    const plugin = this.plugins.get(pluginId)
    if (!plugin) {
      console.warn(`[result-plugin] No plugin found for strategy "${strategy}"${strategy === 'custom' ? ` (plugin: "${pluginId}")` : ''}`)
      return
    }

    // Check if plugin is enabled for this project
    const isEnabled = await this.isPluginEnabled(pluginId, task.project)
    if (!isEnabled) {
      console.warn(`[result-plugin] Plugin "${pluginId}" is disabled for project "${task.project}"`)
      return
    }

    // Get per-project config if any
    const projectConfig = await this.getProjectPluginConfig(pluginId, task.project)

    try {
      await plugin.handle(task, result, projectConfig)
    } catch (err) {
      // Result plugin failure does not block task completion
      console.error(`[result-plugin] Plugin "${pluginId}" failed for task ${task.id}:`, err)
    }
  }

  private async isPluginEnabled(pluginId: string, project: string): Promise<boolean> {
    const entry = await this.db.resultPlugin.findUnique({
      where: { id_project: { id: pluginId, project } },
    })

    // If no entry exists, plugin is enabled by default
    if (!entry) return true
    return entry.enabled
  }

  private async getProjectPluginConfig(pluginId: string, project: string): Promise<unknown> {
    const entry = await this.db.resultPlugin.findUnique({
      where: { id_project: { id: pluginId, project } },
    })
    return entry?.config
  }
}
