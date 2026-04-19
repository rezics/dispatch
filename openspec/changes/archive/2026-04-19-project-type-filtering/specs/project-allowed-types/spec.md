## ADDED Requirements

### Requirement: Project declares allowed task types
A project SHALL have an `allowedTypes` field containing a list of valid task type strings. When `allowedTypes` is empty, any task type is accepted. When non-empty, only listed types are valid.

#### Scenario: Project with allowed types set
- **WHEN** project "alpha" has `allowedTypes: ["email", "sms"]`
- **THEN** only tasks with `type: "email"` or `type: "sms"` can be created in this project

#### Scenario: Project with empty allowed types
- **WHEN** project "beta" has `allowedTypes: []`
- **THEN** tasks with any type string can be created in this project

### Requirement: Task creation validates type against project
When creating a task, the hub SHALL check if the project has a non-empty `allowedTypes` list. If the task's `type` is not in the list, the hub SHALL reject the request with HTTP 400.

#### Scenario: Valid type on creation
- **WHEN** a task with `type: "email"` is created in a project with `allowedTypes: ["email", "sms"]`
- **THEN** the task is created successfully

#### Scenario: Invalid type on creation
- **WHEN** a task with `type: "push"` is created in a project with `allowedTypes: ["email", "sms"]`
- **THEN** the hub returns HTTP 400 with an error indicating the type is not allowed

#### Scenario: Any type accepted when allowedTypes is empty
- **WHEN** a task with `type: "anything"` is created in a project with `allowedTypes: []`
- **THEN** the task is created successfully

### Requirement: Allowed types configurable via project API
The `allowedTypes` field SHALL be settable on project creation (`POST /projects`) and update (`PATCH /projects/:id`).

#### Scenario: Set allowed types on creation
- **WHEN** a root user creates a project with `{ id: "alpha", allowedTypes: ["email", "sms"] }`
- **THEN** the project is created with those allowed types

#### Scenario: Update allowed types
- **WHEN** a root user updates project "alpha" with `{ allowedTypes: ["email", "sms", "push"] }`
- **THEN** the project's allowed types are updated
