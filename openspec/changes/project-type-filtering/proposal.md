## Why

Projects have no way to declare which task types they support, leading to potential typos and misconfiguration. Additionally, HTTP-mode workers cannot filter by task type when claiming — they blindly grab whatever is next, unlike WebSocket workers which route by `capabilities`. This gap means HTTP workers may claim tasks they can't handle.

## What Changes

- Add `allowedTypes: String[]` field to the Project model for declaring valid task types
- Validate task `type` against `allowedTypes` on task creation (when the list is non-empty)
- Add optional `type` parameter to the HTTP claim endpoint (`POST /tasks/claim`)
- Update the claim SQL query to filter by type when specified

## Capabilities

### New Capabilities

- `project-allowed-types`: Projects can declare a list of valid task types; task creation validates against this list

### Modified Capabilities

- `hub-queue`: HTTP claim supports optional type filtering

## Impact

- **Database**: New `allowedTypes` column on Project table (migration)
- **API**: `POST /tasks/claim` accepts optional `type` parameter; `POST /tasks` validates type against project config
- **Schema**: Project model updated in Prisma schema
