## 1. Database Changes

- [ ] 1.1 Add `allowedTypes String[]` field to Project model in `schema.prisma` with `@default([])`
- [ ] 1.2 Create migration for the new column

## 2. Project API

- [ ] 2.1 Accept `allowedTypes` in `POST /projects` and `PATCH /projects/:id` request bodies
- [ ] 2.2 Return `allowedTypes` in project responses

## 3. Task Creation Validation

- [ ] 3.1 In task creation path (`src/queue/create.ts` or API handler), look up project's `allowedTypes`
- [ ] 3.2 If `allowedTypes` is non-empty and `task.type` is not in the list, return HTTP 400

## 4. Claim Type Filtering

- [ ] 4.1 Add optional `type` parameter to claim request schema in `src/api/claim.ts`
- [ ] 4.2 Pass `type` through to `claimTasks` function
- [ ] 4.3 Update claim SQL in `src/queue/claim.ts` to add `AND type = $N` when type is provided

## 5. Verify

- [ ] 5.1 Run type check
- [ ] 5.2 Run existing tests
- [ ] 5.3 Test: create project with allowedTypes, verify invalid type is rejected
- [ ] 5.4 Test: claim with type filter, verify only matching tasks returned
