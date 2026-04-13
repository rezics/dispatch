# Type Definitions

All core types are defined in `@rezics/dispatch-type` and re-exported from `@rezics/dispatch-worker`.

## Task Types

### `TaskStatus`

```typescript
type TaskStatus = 'pending' | 'running' | 'done' | 'failed'
```

### `Task`

```typescript
interface Task {
  id: string
  project: string
  type: string
  payload: unknown
  priority: number
  status: TaskStatus
  workerId: string | null
  attempts: number
  maxAttempts: number
  scheduledAt: Date
  startedAt: Date | null
  leaseExpiresAt: Date | null
  finishedAt: Date | null
  error: string | null
  createdAt: Date
}
```

### `TaskResult`

```typescript
type TaskResult =
  | { strategy: 'discard' }
  | { strategy: 'store'; data: unknown }
  | { strategy: 'webhook'; url: string; data: unknown; headers?: Record<string, string> }
  | { strategy: 'custom'; plugin: string; data: unknown }
```

See [Result Strategies](/plugins/result-strategies) for usage details.

## Plugin Types

### `DispatchPlugin<TConfig>`

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

### `PluginContext<TConfig>`

```typescript
interface PluginContext<TConfig = unknown> {
  config: TConfig
  logger: Logger
  progress: (percent: number, message?: string) => Promise<void>
}
```

### `PluginHandler<TConfig>`

```typescript
type PluginHandler<TConfig = unknown> = (
  task: Task,
  ctx: PluginContext<TConfig>,
) => Promise<TaskResult>
```

### `Logger`

```typescript
interface Logger {
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
}
```

### `TrustLevel`

```typescript
type TrustLevel = 'full' | 'receipted' | 'audited'
```

## Message Types

### `WorkerMessage`

Messages sent from workers to the Hub over WebSocket.

```typescript
type WorkerMessage =
  | { type: 'register'; capabilities: string[]; concurrency: number }
  | { type: 'heartbeat' }
  | { type: 'task:done'; taskId: string; result: TaskResult }
  | { type: 'task:fail'; taskId: string; error: string; retryable: boolean }
  | { type: 'task:progress'; taskId: string; percent: number; message?: string }
```

### `HubMessage`

Messages sent from the Hub to workers over WebSocket.

```typescript
type HubMessage =
  | { type: 'task:dispatch'; task: Task }
  | { type: 'task:cancel'; taskId: string }
  | { type: 'config:update'; config: Record<string, unknown> }
  | { type: 'ping' }
```

## Receipt Types

### `CompletionReceipt`

```typescript
interface CompletionReceipt {
  taskIds: string[]
  workerId: string
  project: string
  issuedAt: number
  expiresAt: number
  nonce: string
  signature: string
}
```

### `signReceipt(receipt, secret)`

Signs a completion receipt with HMAC-SHA256.

```typescript
function signReceipt(
  receipt: Omit<CompletionReceipt, 'signature'>,
  secret: string,
): Promise<CompletionReceipt>
```

See [Trust & Verification](/guide/trust-and-verification) for usage details.

## Auth Types

### `ResolvedIdentity`

Returned by the auth middleware after resolving a JWT or session into a set of permissions.

```typescript
interface ResolvedIdentity {
  sub: string
  isRoot: boolean
  permissions: string[]
  projects: string[] | '*'
  claims: Record<string, unknown>
}
```

### `Permissions`

```typescript
const PERMISSIONS = {
  WORKER_REGISTER:     'worker:register',
  WORKER_UNREGISTER:   'worker:unregister',
  TASK_CLAIM:          'task:claim',
  TASK_COMPLETE:       'task:complete',
  DASHBOARD_VIEW:      'dashboard:view',
  DASHBOARD_PROJECTS:  'dashboard:projects',
  DASHBOARD_WORKERS:   'dashboard:workers',
  DASHBOARD_TASKS:     'dashboard:tasks',
  DASHBOARD_POLICIES:  'dashboard:policies',
  ADMIN_USERS:         'admin:users',
  ADMIN_POLICIES:      'admin:policies',
  ADMIN_ALL:           'admin:*',
}
```

Wildcard permissions (e.g., `admin:*`) match any permission sharing the same prefix.

### `TrustPolicy`

```typescript
interface TrustPolicy {
  id: string
  issPattern: string      // Glob pattern for JWT issuer
  claimField: string      // JWT claim to extract
  claimPattern: string    // Regex to test claim value
  permissions: string[]   // Granted permissions
  projectScope: string | null  // Optional project restriction
  createdBy: string
  createdAt: Date
}
```

See [Trust Policies API](/api/policies) for CRUD operations.
