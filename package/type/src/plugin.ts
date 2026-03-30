import type { ZodType } from 'zod'
import type { Task, TaskResult } from './task'

export type TrustLevel = 'full' | 'receipted' | 'audited'

export interface Logger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
}

export interface PluginContext<TConfig = unknown> {
  config: TConfig
  logger: Logger
  progress: (percent: number, message?: string) => Promise<void>
}

export type PluginHandler<TConfig = unknown> = (
  task: Task,
  ctx: PluginContext<TConfig>,
) => Promise<TaskResult>

export interface DispatchPlugin<TConfig = unknown> {
  name: string
  version: string
  capabilities: string[]
  config: ZodType<TConfig>
  displayName?: string
  description?: string
  trust?: TrustLevel
  mode?: 'http' | 'ws'
  onLoad?: (ctx: PluginContext<TConfig>) => Promise<void>
  onUnload?: (ctx: PluginContext<TConfig>) => Promise<void>
  onError?: (error: Error, ctx: PluginContext<TConfig>) => Promise<void>
  handlers: Record<string, PluginHandler<TConfig>>
}

export function definePlugin<TConfig>(plugin: DispatchPlugin<TConfig>): DispatchPlugin<TConfig> {
  const missing = plugin.capabilities.filter((cap) => !(cap in plugin.handlers))
  if (missing.length > 0) {
    throw new Error(`Missing handlers for capabilities: ${missing.join(', ')}`)
  }
  return plugin
}
