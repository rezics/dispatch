## Context

Task types are free-form strings with no project-level validation. HTTP-mode workers claim tasks without type filtering — the `claimTasks` SQL query only filters by project, status, and scheduledAt. WebSocket workers already route by type via `capabilities.includes(task.type)`, but HTTP workers have no equivalent.

## Goals / Non-Goals

**Goals:**
- Projects can declare valid task types via `allowedTypes`
- Task creation validates type against the project's allowed list
- HTTP claim supports optional type filtering

**Non-Goals:**
- Tag-based filtering (explored and deferred)
- Changing WebSocket dispatch routing
- Making `allowedTypes` mandatory (empty array = no validation)

## Decisions

### 1. `allowedTypes` as `String[]` on Project

**Choice**: Add `allowedTypes String[]` column with default empty array.

**Why**: Matches the existing `capabilities String[]` pattern on Worker. Empty array means "no restriction" — backward compatible, no migration burden for existing projects.

**Alternative considered**: Separate `ProjectType` table with metadata per type. Over-engineering for current needs.

### 2. Validate on task creation, not claim

**Choice**: Check `task.type ∈ project.allowedTypes` in the create path. Claim doesn't validate — if a task exists, it's already valid.

**Why**: Fail fast at creation. A task with an invalid type should never enter the queue.

### 3. Optional `type` parameter on claim

**Choice**: Add optional `type: string` to claim request. When provided, the SQL adds `AND type = $N`.

**Why**: Simple equality filter on an existing indexed column. The composite index `(project, status, priority DESC, scheduledAt ASC)` doesn't include type, but PostgreSQL can combine the index scan with a filter on `type` efficiently since it's applied after the index narrows by project+status. For high-volume cases, a partial index could be added later.

**Alternative considered**: Array of types (`types: string[]`) for claiming multiple types at once. Deferred — single type filter covers the immediate need, and `ANY` queries are easy to add later.

## Risks / Trade-offs

- **[No index on type for claim]** Claim query filters by type without a dedicated index → Acceptable: the existing composite index already narrows to pending tasks in a project; type filter is applied as a post-index filter on a small result set
- **[Empty allowedTypes = no validation]** Permissive by default → Matches current behavior; projects opt into strictness
