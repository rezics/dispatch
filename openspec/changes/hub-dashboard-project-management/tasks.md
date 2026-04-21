## 1. Backend: DELETE /projects/:id endpoint

- [x] 1.1 In `package/hub/src/api/projects.ts`, add a `DELETE /:id` handler under the `adminAuth(db)` section
- [x] 1.2 Implement task-count check: `db.task.count({ where: { project: params.id } })` — if > 0, respond HTTP 409 with `{ error, taskCount }`
- [x] 1.3 On zero tasks, call `db.project.delete({ where: { id: params.id } })` and return 200
- [x] 1.4 Handle Prisma `RecordNotFound` → HTTP 404
- [x] 1.5 Add `detail.summary`, `detail.description`, and `security: [{ Bearer: [] }]` to match other admin mutations

## 2. Backend: DELETE /projects/:id/tasks endpoint

- [x] 2.1 Add `DELETE /:id/tasks` handler under `adminAuth(db)` in `projects.ts`
- [x] 2.2 Validate project exists with `findUnique`; 404 when missing
- [x] 2.3 Require `body: t.Object({ confirm: t.String() })`; return 400 when `confirm !== params.id`
- [x] 2.4 Execute `db.task.deleteMany({ where: { project: params.id } })` and return `{ deleted: count }`
- [x] 2.5 Verify no orphaned foreign-key references remain (review Task relations in `schema.prisma`)

## 3. Backend: Tests

- [x] 3.1 Add test: `DELETE /projects/:id` with no session → 401
- [x] 3.2 Add test: `DELETE /projects/:id` with non-root session → 403
- [x] 3.3 Add test: `DELETE /projects/:id` with tasks present → 409 and task count
- [x] 3.4 Add test: `DELETE /projects/:id` with zero tasks → 200 and project gone
- [x] 3.5 Add test: `DELETE /projects/:id/tasks` with mismatched confirm → 400
- [x] 3.6 Add test: `DELETE /projects/:id/tasks` with matching confirm → deletes all tasks, returns count
- [ ] 3.7 Run `bun test` for the hub package; update snapshots if any

## 4. Dashboard: API client & hooks

- [x] 4.1 Regenerate Eden Treaty types by running `bun check` on `package/hub-dashboard` (the shared Elysia app type should pick up the new routes)
- [x] 4.2 In `package/hub-dashboard/src/api/hooks.ts`, add `useCreateProject` mutation (calls `api.projects.post`)
- [x] 4.3 Add `useUpdateProject` mutation (calls `api.projects({ id }).patch`)
- [x] 4.4 Add `useDeleteProject` mutation (calls `api.projects({ id }).delete`); surface 409 body to callers
- [x] 4.5 Add `useClearProjectTasks` mutation (calls the new `.tasks.delete({ confirm })` endpoint)
- [x] 4.6 On each mutation success, invalidate `['projects']`; for delete/clear also invalidate `['stats', projectId]` and `['tasks']`

## 5. Dashboard: Projects page

- [x] 5.1 Create `package/hub-dashboard/src/pages/Projects.tsx` — use `PageHeader` + `SectionCard` styling to match existing pages
- [x] 5.2 Render the project list as rows showing `id`, `verification`, `jwksUri` presence, `allowedTypes` count, `createdAt`
- [x] 5.3 Add "New project" button visible only when `useAuth().isRoot === true`
- [x] 5.4 Implement the create dialog using shadcn `Dialog` + form primitives (match `Users.tsx` style)
- [x] 5.5 Form fields: `id` (required), `verification` (Select), `jwksUri` (text, with "required for worker auth" hint), `maxTaskHoldTime` (number), `allowedTypes` (chip input — reuse or create a simple tag input component)
- [x] 5.6 Conditional `receiptSecret` field — render only when `verification === 'receipted'`
- [x] 5.7 Implement the edit dialog (same form, `id` disabled, pre-filled from the row data)
- [x] 5.8 Implement per-row action buttons: Edit, Clear tasks, Delete — all gated on `isRoot`
- [x] 5.9 Implement delete flow: call `useDeleteProject`; on 409, open a confirmation dialog showing task count and a "Clear tasks" button
- [x] 5.10 Implement clear-tasks modal: input must type-match project id, submit disabled until exact match, calls `useClearProjectTasks`
- [x] 5.11 Empty state: no projects → show "create your first project" card with the create dialog trigger

## 6. Dashboard: Navigation & routing

- [x] 6.1 Register `/projects` route in `App.tsx` → `<Route path="/projects" element={<Projects />} />`
- [x] 6.2 Add "Projects" link to `components/Navigation.tsx` between Overview and Workers
- [x] 6.3 Add i18n keys for the Projects nav label in `package/i18n/src/en/hub.ts` and mirror to other locales present in the repo

## 7. Dashboard: Overview project selector

- [x] 7.1 In `Overview.tsx`, replace `useStats('default')` with a state-driven project selection
- [x] 7.2 Use `useProjects()` to list projects; default to the first (most recent) one's id
- [x] 7.3 Persist selection in `localStorage` under key `dispatch.overview.project`; hydrate on mount, validate the persisted id still exists
- [x] 7.4 Render a shadcn `Select` at the top of the Overview page showing all projects
- [x] 7.5 When `useProjects()` returns an empty array, render an onboarding card linking to `/projects` instead of the stat cards
- [x] 7.6 Ensure `useStats(selectedProjectId)` refetches on selection change

## 8. Dashboard: i18n

- [x] 8.1 Add English strings for Projects page (title, empty state, form labels, dialog titles, confirmation copy)
- [x] 8.2 Add English strings for Overview selector (label, onboarding card copy)
- [x] 8.3 Mirror to every locale currently present (check `package/i18n/src/` for sibling locales), using placeholder / English fallback where acceptable

## 9. Verify

- [x] 9.1 Run `bun check` on hub and hub-dashboard; resolve type errors
- [ ] 9.2 Run `bun test` across affected packages
- [ ] 9.3 Start dev server and manually verify: non-root user sees no mutation UI; root user can create, edit, delete projects; Overview project selector persists across reload; Clear-tasks typed-confirmation gates submit
- [ ] 9.4 Verify a fresh install (no projects) renders the Overview onboarding and the Projects empty state
- [x] 9.5 Run `openspec validate hub-dashboard-project-management --strict`
