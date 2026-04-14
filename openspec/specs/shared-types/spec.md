## ADDED Requirements

### Requirement: Task type definitions
The system SHALL export a `Task` interface with fields: `id` (UUID string), `project` (string), `type` (string, maps to capability), `payload` (unknown), `priority` (number 1-10), `status` (TaskStatus), `workerId` (string | null), `attempts` (number), `maxAttempts` (number), `scheduledAt` (Date), `startedAt` (Date | null), `leaseExpiresAt` (Date | null), `maxHoldExpiresAt` (Date | null), `finishedAt` (Date | null), `error` (string | null), `createdAt` (Date).

#### Scenario: Import Task type
- **WHEN** a consumer imports `Task` from `@rezics/dispatch-type`
- **THEN** the type includes all specified fields including `maxHoldExpiresAt`

### Requirement: TaskStatus union type
The system SHALL export a `TaskStatus` type as the union `'pending' | 'running' | 'done' | 'failed'`.

#### Scenario: Status assignment
- **WHEN** a variable of type `TaskStatus` is assigned `'pending'`, `'running'`, `'done'`, or `'failed'`
- **THEN** the assignment compiles without error

#### Scenario: Invalid status rejected
- **WHEN** a variable of type `TaskStatus` is assigned `'cancelled'`
- **THEN** the TypeScript compiler reports a type error

### Requirement: TaskResult union type
The system SHALL export a `TaskResult` discriminated union with strategies: `discard`, `store` (with `data: unknown`), `webhook` (with `url: string`, `data: unknown`, optional `headers`), and `custom` (with `plugin: string`, `data: unknown`).

#### Scenario: Discard result
- **WHEN** a handler returns `{ strategy: 'discard' }`
- **THEN** the value satisfies the `TaskResult` type

#### Scenario: Webhook result
- **WHEN** a handler returns `{ strategy: 'webhook', url: 'https://example.com', data: {} }`
- **THEN** the value satisfies the `TaskResult` type

### Requirement: DispatchPlugin interface
The system SHALL export a `DispatchPlugin<TConfig>` interface generic over a Zod schema type, with fields: `name`, `version`, `capabilities` (string[]), `config` (TConfig), optional `displayName`, `description`, `trust`, `mode`, lifecycle hooks (`onLoad`, `onUnload`, `onError`), and a `handlers` record keyed by capability string.

#### Scenario: Plugin with typed config
- **WHEN** a plugin is defined with `config: z.object({ rateLimit: z.number() })`
- **THEN** the `onLoad` handler receives a typed object with `rateLimit: number`

### Requirement: definePlugin runtime validation
The system SHALL export a `definePlugin()` function that validates every declared capability has a matching handler entry and throws if any are missing.

#### Scenario: Valid plugin passes
- **WHEN** `definePlugin()` is called with `capabilities: ['book:crawl']` and `handlers: { 'book:crawl': fn }`
- **THEN** it returns the plugin definition without error

#### Scenario: Missing handler throws
- **WHEN** `definePlugin()` is called with `capabilities: ['book:crawl']` but no `'book:crawl'` handler
- **THEN** it throws an error naming the missing capability

### Requirement: PluginContext interface
The system SHALL export a `PluginContext<TConfig>` interface with: `config` (TConfig), `logger` (Logger), and `progress` (function accepting percent and optional message).

#### Scenario: Progress reporting
- **WHEN** a handler calls `ctx.progress(50, 'Halfway')`
- **THEN** the call compiles and the function signature matches `(percent: number, message?: string) => Promise<void>`

### Requirement: WebSocket message types
The system SHALL export `WorkerMessage` and `HubMessage` discriminated union types covering all WS protocol messages: `register`, `heartbeat`, `task:done`, `task:fail`, `task:progress` (worker-to-hub) and `task:dispatch`, `task:cancel`, `config:update`, `ping` (hub-to-worker).

#### Scenario: Worker register message
- **WHEN** a message `{ type: 'register', capabilities: ['book:crawl'], concurrency: 10 }` is created
- **THEN** it satisfies the `WorkerMessage` type

### Requirement: CompletionReceipt interface
The system SHALL export a `CompletionReceipt` interface with fields: `taskIds` (string[]), `workerId` (string), `project` (string), `issuedAt` (number), `expiresAt` (number), `nonce` (string), `signature` (string).

#### Scenario: Receipt structure
- **WHEN** a receipt object is constructed with all required fields
- **THEN** it satisfies the `CompletionReceipt` type

### Requirement: TrustLevel type
The system SHALL export a `TrustLevel` type as the union `'full' | 'receipted' | 'audited'`.

#### Scenario: Trust level values
- **WHEN** each of `'full'`, `'receipted'`, `'audited'` is assigned to a `TrustLevel` variable
- **THEN** all three compile without error

### Requirement: SingleRunConfig type
The system SHALL export a `SingleRunConfig` type with fields: `timeout` (number, required), `claimCount` (number, optional).

#### Scenario: Import SingleRunConfig type
- **WHEN** a consumer imports `SingleRunConfig` from `@rezics/dispatch-type`
- **THEN** the type includes `timeout: number` and optional `claimCount?: number`

### Requirement: WorkerStatus type
The system SHALL export a `WorkerStatus` type with fields: `mode` (`'http' | 'ws' | 'single-run'`), `connected` (boolean), `uptime` (number, milliseconds), `counts` (`{ active: number; completed: number; failed: number }`).

#### Scenario: Import WorkerStatus type
- **WHEN** a consumer imports `WorkerStatus` from `@rezics/dispatch-type`
- **THEN** the type includes all specified fields

### Requirement: ActiveTaskInfo type
The system SHALL export an `ActiveTaskInfo` type with fields: `taskId` (string), `type` (string), `startedAt` (Date), `progress` (number | null).

#### Scenario: Import ActiveTaskInfo type
- **WHEN** a consumer imports `ActiveTaskInfo` from `@rezics/dispatch-type`
- **THEN** the type includes all specified fields
