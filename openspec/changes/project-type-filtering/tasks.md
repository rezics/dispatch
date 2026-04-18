## 1. Database Changes

- [x] 1.1 Add `allowedTypes String[]` field to Project model in `schema.prisma` with `@default([])`
- [x] 1.2 Create migration for the new column

## 2. Project API

- [x] 2.1 Accept `allowedTypes` in `POST /projects` and `PATCH /projects/:id` request bodies
- [x] 2.2 Return `allowedTypes` in project responses

## 3. Task Creation Validation

- [x] 3.1 In task creation path (`src/queue/create.ts` or API handler), look up project's `allowedTypes`
- [x] 3.2 If `allowedTypes` is non-empty and `task.type` is not in the list, return HTTP 400

## 4. Claim Type Filtering

- [x] 4.1 Add optional `type` parameter to claim request schema in `src/api/claim.ts`
- [x] 4.2 Pass `type` through to `claimTasks` function
- [x] 4.3 Update claim SQL in `src/queue/claim.ts` to add `AND type = $N` when type is provided

## 5. Verify

- [x] 5.1 Run type check
- [x] 5.2 Run existing tests
- [x] 5.3 Test: create project with allowedTypes, verify invalid type is rejected
- [x] 5.4 Test: claim with type filter, verify only matching tasks returned
