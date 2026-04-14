## ADDED Requirements

### Requirement: Plugin loading via worker.use()
The worker SHALL provide a `use(plugin, config)` method that registers a plugin, validates its config against the plugin's Zod schema, and adds its capabilities to the worker's aggregate capability set.

#### Scenario: Register plugin
- **WHEN** `worker.use(BookCrawlerPlugin, { rateLimit: 10 })` is called
- **THEN** the plugin's capabilities (`book:crawl`, `book:update`) are added to the worker's capability set

### Requirement: Capability aggregation from all plugins
The worker SHALL compute its total capability set as the union of all registered plugins' `capabilities` arrays. This set is sent to the hub during registration (WS) or used to validate claims (HTTP).

#### Scenario: Multiple plugins
- **WHEN** two plugins are registered with capabilities `['book:crawl']` and `['anime:crawl', 'anime:update']`
- **THEN** the worker's aggregate capabilities are `['book:crawl', 'anime:crawl', 'anime:update']`

### Requirement: Capability collision detection
If two plugins declare the same capability string, the worker SHALL throw an error at startup. Each capability MUST map to exactly one handler.

#### Scenario: Duplicate capability
- **WHEN** plugin A declares `['book:crawl']` and plugin B also declares `['book:crawl']`
- **THEN** the worker throws an error naming the conflicting capability and both plugins

### Requirement: Plugin lifecycle hooks
The worker SHALL call `onLoad(config)` for each plugin during startup (in registration order) and `onUnload()` during shutdown (in reverse order).

#### Scenario: onLoad called at startup
- **WHEN** the worker starts with two plugins registered
- **THEN** `onLoad` is called on the first plugin, then the second, before any tasks are claimed

#### Scenario: onUnload called at shutdown
- **WHEN** the worker shuts down with two plugins registered
- **THEN** `onUnload` is called on the second plugin, then the first, after all tasks complete

### Requirement: Task routing to plugin handler
When a task is received, the worker SHALL match the task's `type` field against the registered capability→handler map and invoke the matching handler with the task and a `PluginContext`.

#### Scenario: Task routed to correct handler
- **WHEN** a task with `type: 'book:crawl'` is received and a plugin registered a handler for `'book:crawl'`
- **THEN** the `'book:crawl'` handler is invoked with the task

#### Scenario: No matching handler
- **WHEN** a task with `type: 'unknown:action'` is received and no plugin handles it
- **THEN** the task is reported as failed with an error indicating no handler found

### Requirement: PluginContext provides logger and progress
Each handler invocation SHALL receive a `PluginContext` with `config` (the plugin's validated config), `logger` (scoped to the plugin name), and `progress` (function to report task progress).

#### Scenario: Progress reporting
- **WHEN** a handler calls `ctx.progress(50, 'Halfway done')`
- **THEN** in WS mode, a `task:progress` message is sent to the hub; in HTTP mode, the progress is logged locally

### Requirement: Plugin terminology distinction
Worker plugins (task handler modules registered via `definePlugin`) SHALL be clearly distinguished from hub result plugins (server-side result routing) in all documentation, type names, and API references. Worker plugins handle task execution; hub result plugins process completed task results.

#### Scenario: Documentation references
- **WHEN** documentation refers to the worker's plugin system
- **THEN** it uses the term "worker plugin" or "task handler module", never "plugin" without qualification
