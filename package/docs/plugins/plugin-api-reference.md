# Plugin API Reference

## `definePlugin<TConfig>(plugin)`

Creates and validates a plugin definition. Throws if any declared capability is missing a handler.

```typescript
import { definePlugin } from '@rezics/dispatch-worker'

const plugin = definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  capabilities: ['my:task'],
  config: z.object({ key: z.string() }),
  handlers: {
    'my:task': async (task, ctx) => {
      return { strategy: 'discard' }
    },
  },
})
```

**Returns:** `DispatchPlugin<TConfig>`

## `DispatchPlugin<TConfig>`

The full plugin interface.

```typescript
interface DispatchPlugin<TConfig = unknown> {
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
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Unique plugin identifier |
| `version` | `string` | Yes | Semantic version |
| `capabilities` | `string[]` | Yes | Task types this plugin handles |
| `config` | `ZodType<TConfig>` | Yes | Zod schema for plugin configuration |
| `displayName` | `string` | No | Human-readable name |
| `description` | `string` | No | Plugin description |
| `trust` | `TrustLevel` | No | Preferred trust level (`'full'`, `'receipted'`, `'audited'`) |
| `mode` | `'http' \| 'ws'` | No | Preferred communication mode |
| `onLoad` | `function` | No | Called when worker starts |
| `onUnload` | `function` | No | Called on graceful shutdown |
| `onError` | `function` | No | Called on unhandled errors |
| `handlers` | `Record<string, PluginHandler>` | Yes | Handler function per capability |

## `PluginHandler<TConfig>`

A function that processes a task and returns a result.

```typescript
type PluginHandler<TConfig = unknown> = (
  task: Task,
  ctx: PluginContext<TConfig>,
) => Promise<TaskResult>
```

## `PluginContext<TConfig>`

Context object passed to handlers and lifecycle hooks.

```typescript
interface PluginContext<TConfig = unknown> {
  config: TConfig
  logger: Logger
  progress: (percent: number, message?: string) => Promise<void>
}
```

| Field | Type | Description |
| --- | --- | --- |
| `config` | `TConfig` | Validated plugin configuration |
| `logger` | `Logger` | Structured logger |
| `progress` | `function` | Report task progress (0-100) |

## `Logger`

```typescript
interface Logger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
}
```

## `TrustLevel`

```typescript
type TrustLevel = 'full' | 'receipted' | 'audited'
```

See [Trust & Verification](/guide/trust-and-verification) for details on each level.
