## MODIFIED Requirements

### Requirement: Navigation
The hub-dashboard SHALL have a sidebar or top navigation with links to: Overview, Workers, Tasks, Plugins. All navigation items SHALL be visible to all authenticated users. Permission-based nav filtering SHALL be removed.

#### Scenario: Navigate between pages
- **WHEN** the user clicks "Tasks" in the navigation
- **THEN** the tasks page is rendered without a full page reload (SPA routing)

#### Scenario: All nav items visible
- **WHEN** any authenticated user views the dashboard
- **THEN** all navigation links (Overview, Workers, Tasks, Plugins) are visible

## REMOVED Requirements

### Requirement: Permission-based navigation filtering
**Reason:** The permission system is being removed. Dashboard access is root-only, so all nav items are always visible. No need for granular dashboard permissions (`dashboard:view`, `dashboard:projects`, etc.).
**Migration:** Remove permission checks from nav component. All nav items render unconditionally for authenticated users.
