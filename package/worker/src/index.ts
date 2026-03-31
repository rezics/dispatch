export { defineWorkerConfig, type WorkerConfig } from './core/config'
export { createWorker } from './core/worker'
export { definePlugin } from '@rezics/dispatch-type'
export type {
  DispatchPlugin,
  PluginContext,
  PluginHandler,
  Logger,
  Task,
  TaskResult,
  TrustLevel,
  WorkerMessage,
  HubMessage,
  CompletionReceipt,
} from '@rezics/dispatch-type'
