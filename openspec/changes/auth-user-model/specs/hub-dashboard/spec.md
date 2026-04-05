## ADDED Requirements

### Requirement: Dashboard authentication
The hub-dashboard SHALL require authentication. Unauthenticated requests to dashboard API endpoints SHALL return HTTP 401. The dashboard frontend SHALL redirect unauthenticated users to a login page.

#### Scenario: Unauthenticated dashboard access
- **WHEN** an unauthenticated request is made to a dashboard API endpoint
- **THEN** the hub returns HTTP 401

#### Scenario: Authenticated dashboard access
- **WHEN** a request with a valid session cookie or Bearer token with `dashboard:view` permission is made
- **THEN** the dashboard content is served

### Requirement: Policies management page
The hub-dashboard SHALL include a Policies page accessible to users with `admin:policies` permission. The page SHALL display all trust policies in a table and allow creating, editing, and deleting policies.

#### Scenario: View policies
- **WHEN** an admin user navigates to the Policies page
- **THEN** all trust policies are displayed with their issuer pattern, claim field, claim pattern, and permissions

#### Scenario: Create policy from dashboard
- **WHEN** an admin user fills in the new policy form and submits
- **THEN** a `POST /policies` request is sent and the new policy appears in the table

### Requirement: Users management page
The hub-dashboard SHALL include a Users page accessible to users with `admin:users` permission. The page SHALL display all users and allow creating new users.

#### Scenario: View users
- **WHEN** an admin user navigates to the Users page
- **THEN** all users are displayed with their ID, root status, and creation date

## MODIFIED Requirements

### Requirement: Navigation
The hub-dashboard SHALL have a sidebar or top navigation with links to: Overview, Workers, Tasks, Plugins, Policies, Users. The Policies and Users links SHALL only be visible to users with the corresponding admin permissions.

#### Scenario: Admin sees all nav items
- **WHEN** a user with `admin:*` permission views the dashboard
- **THEN** all navigation items including Policies and Users are visible

#### Scenario: Regular user sees limited nav
- **WHEN** a user with only `dashboard:view` and `dashboard:tasks` permissions views the dashboard
- **THEN** only Overview and Tasks navigation items are visible (plus any others matching their permissions)
