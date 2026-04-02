# Result Strategies

When a plugin handler completes a task, it returns a `TaskResult` that tells the Hub what to do with the output. There are four strategies.

## `discard`

The result is discarded. The task is marked as `done` with no stored output.

```typescript
return { strategy: 'discard' }
```

**When to use:** The task performs a side effect (sending an email, updating an external system) and produces no data to store.

## `store`

The result data is stored in the Hub's `TaskResult` table and can be retrieved later.

```typescript
return {
  strategy: 'store',
  data: {
    title: 'Example Book',
    author: 'Jane Doe',
    chapters: 42,
  },
}
```

**When to use:** You need to query task results from the Hub later, or keep a record of outputs.

## `webhook`

The result is POSTed as JSON to an external URL.

```typescript
return {
  strategy: 'webhook',
  url: 'https://example.com/api/callback',
  data: {
    title: 'Example Book',
    author: 'Jane Doe',
  },
  headers: {
    'X-API-Key': 'secret',
  },
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | `string` | Yes | Webhook endpoint URL |
| `data` | `unknown` | Yes | Payload to POST |
| `headers` | `Record<string, string>` | No | Additional HTTP headers |

**When to use:** Your main application needs to receive results in real time, or you want to push results to a third-party service.

## `custom`

The result is routed to a named result plugin configured on the Hub side.

```typescript
return {
  strategy: 'custom',
  plugin: 'my-result-handler',
  data: { title: 'Example Book' },
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `plugin` | `string` | Yes | Name of the Hub-side result plugin |
| `data` | `unknown` | Yes | Payload passed to the plugin |

**When to use:** You need custom server-side result processing that goes beyond simple storage or webhooks.

## Type Definition

```typescript
type TaskResult =
  | { strategy: 'discard' }
  | { strategy: 'store'; data: unknown }
  | { strategy: 'webhook'; url: string; data: unknown; headers?: Record<string, string> }
  | { strategy: 'custom'; plugin: string; data: unknown }
```

## Choosing a Strategy

| Strategy | Stored on Hub | Pushed externally | Custom logic |
| --- | --- | --- | --- |
| `discard` | No | No | No |
| `store` | Yes | No | No |
| `webhook` | No | Yes | No |
| `custom` | Depends | Depends | Yes |
