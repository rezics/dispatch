## Context

Projects are the primary organizational unit in dispatch: tasks, workers, and the worker JWKS verification chain all hang off a project. After the `simplify-project-auth` change, the only way to create a project is through `POST /projects` with a root session cookie — but the hub-dashboard never grew a create/edit UI. Two parallel gaps result:

1. Operators must hit the raw API (or a seed script) to register projects.
2. The Overview page's `useStats('default')` query 404s on clean installs that don't happen to have a project named `default`.

The root-only auth model assumes a single administrator using the dashboard. That administrator currently has no way to do basic project lifecycle through the UI.

## Goals / Non-Goals

**Goals:**
- Full CRUD for projects through the dashboard UI, gated on `isRoot`
- Remove the hard-coded `'default'` project assumption from Overview
- Give operators a safe way to clear a project's tasks (required for project deletion)
- Keep the existing `Plugins` page untouched so the `/plugins` route remains available for future plugin features

**Non-Goals:**
- Project-level RBAC (single-user/root model remains; `isRoot` is the only gate)
- Multi-project context across Workers and Tasks pages (Overview selector only; Workers/Tasks keep current behavior)
- Soft delete / archival — hard delete only, with "block if has tasks" guard
- Renaming projects (project `id` is immutable; not addressed here)
- Auditing who performed mutations (no changelog/event log in scope)

## Decisions

### 1. Independent `/projects` route; leave `/plugins` untouched

**Choice**: Add a new `Projects.tsx` page mounted at `/projects`. Do not repurpose the existing `Plugins.tsx`, which currently shows projects but is mislabeled.

**Why**: The user wants `/plugins` preserved for a future real plugin concept. Folding project management into Plugins would block that future work. Cost of a new file is trivial; the benefit is a clean separation.

**Alternative considered**: Rename Plugins → Projects. Rejected per explicit user preference to keep Plugins available.

**Follow-up**: The existing `Plugins.tsx` will still display the project list until a real plugin concept arrives. That's acceptable short-term duplication; a later change can strip project content out of Plugins once the plugin surface materializes.

### 2. Delete flow: block if tasks exist, offer task-clearing as escape hatch

**Choice**: `DELETE /projects/:id` returns HTTP 409 Conflict with `{ error: "project has tasks", taskCount: N }` when any task exists for the project. A separate `DELETE /projects/:id/tasks` clears all tasks.

**Why**: Silent cascade-delete of tasks is unsafe — an accidental project delete could wipe operational history. Blocking forces the operator to acknowledge the task population. The separate clearing endpoint makes the destructive step explicit and loggable.

**Defense in depth**:
- Backend: `DELETE /projects/:id/tasks` requires `{ confirm: "<project-id>" }` in the body; mismatch returns 400
- Frontend: Modal requires typing the project id in an input that matches before the submit button enables

**Alternative considered**: Cascade delete with a single confirmation. Rejected — one typo away from data loss.

### 3. Clear-tasks scope includes all statuses

**Choice**: `DELETE /projects/:id/tasks` deletes every task for the project regardless of status (pending, running, done, failed).

**Why**: The typed-confirmation UX makes this a destructive, deliberate operation. Excluding running tasks creates a confusing partial-clear state where the user thinks they've cleaned up but the project still can't be deleted. If workers hold leases on deleted tasks, their next completion attempt will fail with "task not found" — that's already handled gracefully by the completion path (404 is not fatal for workers; they move on).

**Alternative considered**: Only clear terminal (done/failed) tasks. Rejected — doesn't meet the "now I can delete the project" goal.

**Race condition acknowledged**: A worker might claim a new task between the clear and the delete. The UI will re-prompt with "project now has N tasks" on the next delete attempt rather than partial-retry. The 409 guard on delete makes this safe.

### 4. Overview: project selector with localStorage persistence

**Choice**: Overview gains a project `<Select>` at the top. Default selection: the first project returned by `GET /projects` (ordered by `createdAt desc`). Selection persists in `localStorage` under `dispatch.overview.project`. Empty project list renders an onboarding card with "Create your first project" linking to `/projects`.

**Why**: Per-tab state (URL query param) would make sharing links confusing. Global app context is out of scope (Non-Goal). localStorage gives the operator a stable default across reloads without spreading context into Tasks/Workers.

**Alternative considered**: URL query param (`/?project=xyz`). Rejected — adds router complexity for a Non-Goal (cross-page sync).

### 5. Root-gating via `AuthContext.isRoot` only

**Choice**: Mutation UI (new-project button, edit button, delete button, clear-tasks button) is conditionally rendered on `isRoot`. Non-root users see read-only list.

**Why**: Auth model is already root-only; `AuthContext` already exposes `isRoot` from `/auth/me`. No new state needed. The server remains the source of truth (adminAuth middleware).

**UX note**: Hiding (not disabling) the buttons keeps the UI clean. A non-root user on a read-only dashboard doesn't need to be reminded of what they can't do.

### 6. Form conditional fields mirror backend schema

**Choice**: The create/edit form shows:
- Always: `id` (create only, disabled on edit), `verification` (select: none/receipted/audited), `jwksUri`, `maxTaskHoldTime`, `allowedTypes` (chip input)
- Conditional: `receiptSecret` shown only when `verification === 'receipted'`
- Inline hint: "Required for worker authentication" next to `jwksUri`

**Why**: `receiptSecret` is only consulted in receipted mode. Hiding it in other modes avoids confusion about what gets stored. The `jwksUri` hint warns the operator before they save a worker-unusable project; backend already 401s workers without it, so no extra validation needed — just UX courtesy.

**Alternative considered**: Hard-require `jwksUri` on the form. Rejected — projects can exist for admin/seed use cases that don't involve workers.

### 7. React Query mutations with `invalidateQueries`

**Choice**: `useCreateProject`, `useUpdateProject`, `useDeleteProject`, `useClearProjectTasks` in `api/hooks.ts`. On success, invalidate `['projects']` and (for clear/delete) `['stats', projectId]` and `['tasks']`.

**Why**: Pattern already used by `Users.tsx`. Keeps the data layer consistent.

## Risks / Trade-offs

- **[Eden Treaty client regeneration]** New endpoints require regenerating the hub-dashboard's typed client. → `bun check` in CI will surface any type mismatches; regeneration happens at build time via the shared Elysia app type export.

- **[Orphaned queue references]** Deleting a project doesn't automatically clean up in-memory state (WebSocket worker registrations targeting the project). → Accepted; the 409-on-tasks guard means deletion only happens for a project with zero task state, and WS workers for a deleted project will get 401 on their next auth attempt (project lookup fails).

- **[Concurrent mutation from two operators]** With a single root user in practice, this is nearly impossible, but two open dashboards could race. → Backend operations are atomic; worst case is one operation returning 404/409. UI surfaces the error and refetches.

- **[Clear-tasks while workers are leasing]** Workers may hold in-flight leases. → Their completion attempts will 404 gracefully; documented in decision 3.

- **[No delete audit trail]** The dashboard doesn't log who deleted what. → Out of scope; single-user root model means the logs are also single-user.

## Migration Plan

This change is additive for existing deployments:

1. Deploy backend with new `DELETE /projects/:id` and `DELETE /projects/:id/tasks` endpoints.
2. Deploy dashboard with new Projects page and Overview selector.
3. No data migration required.
4. Existing deployments with a `default` project: Overview selector picks `default` (or the most recent project); no user action needed.
5. Fresh deployments: Overview shows onboarding → operator clicks through to `/projects` → creates first project.

**Rollback**: Frontend-only rollback is safe (read-only fallback). Backend rollback removes the new endpoints; any in-flight delete UI calls will 404, which the frontend already handles.

## Open Questions

- **Should `GET /projects` require auth in this change?** Currently public. Out of scope here — if it becomes a concern, a follow-up change can gate it with `adminAuth` too. For now, the dashboard assumes an authenticated session and never renders the Projects page to anonymous users anyway.
- **i18n coverage**: new strings added to English (`en/hub.ts`) and mirrored to other locales? Defer to tasks.md — mirror to all locales that exist for the current Users/Plugins pages.
