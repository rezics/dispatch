## MODIFIED Requirements

### Requirement: Overview page
The hub-dashboard SHALL display an overview page showing: task counts by status (pending, running, done, failed), a queue depth chart over time, a throughput chart (tasks completed per minute), and current connected worker count. The page SHALL be rendered using shadcn/ui primitives (Card, etc.) and Tailwind utilities. When at least one project exists, the overview SHALL include a project selector whose selection persists across reloads via `localStorage`; stats and charts SHALL reflect the selected project. When no project exists, the overview SHALL replace its stat cards with an onboarding prompt linking to `/projects`.

#### Scenario: Overview loads with a selected project
- **WHEN** the overview page is opened and at least one project exists
- **THEN** the page displays live counts for the selected project, a queue depth chart, and worker count

#### Scenario: Project selector persists across reload
- **WHEN** the operator selects project `crawl` on the overview and reloads the page
- **THEN** the overview re-opens with `crawl` still selected

#### Scenario: Data refreshes automatically
- **WHEN** the overview page is open for 10 seconds
- **THEN** the counts and charts update with fresh data from the hub API

#### Scenario: Overview with no projects shows onboarding
- **WHEN** the overview page is opened and `GET /projects` returns an empty list
- **THEN** the page shows an onboarding card with a link to `/projects` and no stat cards

## ADDED Requirements

### Requirement: Projects page
The hub-dashboard SHALL expose a Projects page at `/projects` that lists all projects returned by `GET /projects` in a shadcn/ui-rendered table. Each row SHALL show the project `id`, `verification`, `jwksUri` presence, `allowedTypes` count, and `createdAt`. The page SHALL be reachable from the navigation entry positioned between Overview and Workers.

#### Scenario: Projects listed
- **WHEN** the Projects page is opened and 3 projects are registered
- **THEN** 3 rows render with each project's fields

#### Scenario: Empty state
- **WHEN** the Projects page is opened and no projects exist
- **THEN** the page shows an empty-state card prompting the operator to create one

### Requirement: Project create form
The Projects page SHALL provide a create form available only to root users. The form SHALL include: `id` (required text), `verification` (select: `none` / `receipted` / `audited`), `jwksUri` (optional text with inline hint that it is required for worker authentication), `maxTaskHoldTime` (optional positive integer), and `allowedTypes` (tag/chip input, optional). The form SHALL conditionally show a `receiptSecret` field when `verification === 'receipted'`. Submission SHALL call `POST /projects`; on success the list SHALL refetch.

#### Scenario: Non-root user has no create form
- **WHEN** a non-root user opens the Projects page
- **THEN** no "new project" button or create form is rendered

#### Scenario: Receipt secret field conditional
- **WHEN** the operator selects `verification = receipted`
- **THEN** the `receiptSecret` field appears in the form

#### Scenario: Receipt secret hidden when not receipted
- **WHEN** the operator selects `verification = none` or `audited`
- **THEN** the `receiptSecret` field is not rendered

#### Scenario: Successful create
- **WHEN** a root user submits the form with `id = "crawl"` and valid fields
- **THEN** `POST /projects` is called, the dialog closes, and `crawl` appears in the list

### Requirement: Project edit form
The Projects page SHALL allow a root user to edit an existing project's mutable fields (`verification`, `receiptSecret`, `jwksUri`, `maxTaskHoldTime`, `allowedTypes`). The `id` field SHALL be read-only on edit. Submission SHALL call `PATCH /projects/:id`.

#### Scenario: Edit opens with current values
- **WHEN** a root user clicks "edit" on the `crawl` row
- **THEN** the form opens pre-filled with the project's current values

#### Scenario: Non-root user cannot edit
- **WHEN** a non-root user opens the Projects page
- **THEN** no "edit" control is rendered on any row

### Requirement: Project deletion with task guard
The Projects page SHALL allow a root user to delete a project via a `DELETE /projects/:id` call. If the API returns HTTP 409, the dashboard SHALL surface a dialog showing the task count and offering a "Clear tasks" action. The delete button SHALL NOT be visible to non-root users.

#### Scenario: Delete succeeds
- **WHEN** a root user confirms deletion of a project with no tasks
- **THEN** the project is removed from the list

#### Scenario: Delete blocked by tasks
- **WHEN** a root user attempts to delete a project and the API returns 409 with `taskCount: 12`
- **THEN** the dashboard shows a dialog reporting "12 tasks" and a "Clear tasks" action

#### Scenario: Non-root user sees no delete control
- **WHEN** a non-root user opens the Projects page
- **THEN** no delete control is rendered on any row

### Requirement: Clear tasks with typed confirmation
The Projects page SHALL provide a "Clear tasks" action gated behind a typed-confirmation modal. The modal SHALL require the operator to type the project's `id` into an input that matches exactly before the submit control enables. On submit, the dashboard SHALL call `DELETE /projects/:id/tasks` with `{ confirm: "<project-id>" }`.

#### Scenario: Submit disabled until id typed
- **WHEN** the clear-tasks modal opens for project `crawl` and the confirmation input is empty
- **THEN** the submit button is disabled

#### Scenario: Submit enabled on exact match
- **WHEN** the operator types `crawl` into the confirmation input
- **THEN** the submit button is enabled

#### Scenario: Mismatched confirmation rejected
- **WHEN** the operator types `Crawl` (case mismatch) into the confirmation input
- **THEN** the submit button remains disabled

#### Scenario: Successful clear
- **WHEN** the operator submits the modal with matching confirmation
- **THEN** `DELETE /projects/:id/tasks` is called and the task list for the project becomes empty

### Requirement: Navigation includes Projects entry
The hub-dashboard navigation SHALL expose a "Projects" entry linking to `/projects`, positioned between the Overview and Workers entries. The entry SHALL be visible to both root and non-root users (since `GET /projects` is public).

#### Scenario: Navigation order
- **WHEN** the navigation is rendered
- **THEN** the entries appear in the order: Overview, Projects, Workers, Tasks, Plugins, Users

### Requirement: Mutation UI gated by root status
All project mutation controls on the Projects page (new-project button, row edit, row delete, clear-tasks) SHALL be rendered only when `AuthContext.isRoot === true`. Non-root users SHALL see a read-only list.

#### Scenario: Root sees mutation controls
- **WHEN** a root user opens the Projects page
- **THEN** the "new project", "edit", "delete", and "clear tasks" controls are rendered

#### Scenario: Non-root sees read-only list
- **WHEN** a non-root user opens the Projects page
- **THEN** only the list is rendered — no mutation controls appear
