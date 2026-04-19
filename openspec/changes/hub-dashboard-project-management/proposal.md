## Why

The hub-dashboard lacks a UI for managing projects. `POST /projects` and `PATCH /projects/:id` have been root-gated on the backend since the auth simplification, but operators still have to use the API directly (or seed scripts) to create projects. The Overview page hard-codes `useStats('default')`, so a fresh deployment with no `default` project 404s on load. Without dashboard CRUD, the root-only auth model is incomplete in practice.

## What Changes

- Add a dedicated `/projects` route and Projects page to hub-dashboard (list, create, edit, delete) — independent from the existing `Plugins` page, which is left as a future home for actual plugin UI
- Add navigation entry for Projects between Overview and Workers
- Add conditional form fields in the create/edit form: show `receiptSecret` when `verification = "receipted"`, mark `jwksUri` as required for worker-facing projects
- Gate all mutation UI (create, edit, delete, clear-tasks buttons) behind `isRoot` from `AuthContext` — non-root users see read-only views
- Replace the hard-coded `'default'` project on the Overview page with a project selector; empty project list shows an onboarding prompt that links to `/projects`
- **BREAKING**: Add `DELETE /projects/:id` endpoint — returns HTTP 409 if the project has any tasks (any status)
- Add `DELETE /projects/:id/tasks` endpoint for clearing all of a project's tasks; requires root auth and a confirmation payload matching the project id (defense-in-depth; the UI also requires typing the id)
- Frontend delete flow: if 409, surface the "Clear tasks" action; the destructive modal requires typing the project id to confirm

## Capabilities

### New Capabilities

_None — this change extends existing capabilities._

### Modified Capabilities

- `hub-api`: Add `DELETE /projects/:id` and `DELETE /projects/:id/tasks` endpoints, both admin-gated
- `hub-dashboard`: Add Projects page with CRUD, add project selector to Overview, add root-gated mutation UI

## Impact

- **API**: Two new endpoints under `/projects`. No change to existing endpoints.
- **Database**: No schema change. Deletes cascade only via explicit task-clearing endpoint; project deletion is blocked when tasks exist.
- **Dashboard routing**: New `/projects` route; Overview behavior changes when no project exists.
- **Generated client (Eden Treaty)**: hub-dashboard's `api` client regenerates to include the new endpoints.
- **i18n**: New strings for Projects page, project selector, and confirmation modals.
- **Backwards compatibility**: Existing deployments with a `default` project continue to work; Overview selector defaults to first project in the list.
