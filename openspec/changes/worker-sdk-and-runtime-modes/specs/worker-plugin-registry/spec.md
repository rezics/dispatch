## ADDED Requirements

### Requirement: Plugin terminology distinction
Worker plugins (task handler modules registered via `definePlugin`) SHALL be clearly distinguished from hub result plugins (server-side result routing) in all documentation, type names, and API references. Worker plugins handle task execution; hub result plugins process completed task results.

#### Scenario: Documentation references
- **WHEN** documentation refers to the worker's plugin system
- **THEN** it uses the term "worker plugin" or "task handler module", never "plugin" without qualification
