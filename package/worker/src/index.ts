export { defineWorkerConfig, type WorkerConfig, type WorkerConfigInput } from './core/config'
export { createWorker, type Worker } from './core/worker'
export { definePlugin } from '@rezics/dispatch-type'
export type {
  DispatchPlugin,
  PluginContext,
  PluginHandler,
  Logger,
  Task,
  TaskResult,
  VerificationMode,
  WorkerMessage,
  HubMessage,
  CompletionReceipt,
  SingleRunConfig,
  WorkerStatus,
  ActiveTaskInfo,
} from '@rezics/dispatch-type'
