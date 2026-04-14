## ADDED Requirements

### Requirement: Rezics project seed
The hub seed script SHALL create a Rezics project when `DISPATCH_SEED_REZICS=true` (or `--rezics` flag). The project SHALL have `id: "rezics"`, `verification: "audited"`, `receiptSecret` from `DISPATCH_RECEIPT_SECRET` env var, and `jwksUri` from `DISPATCH_AUTH_JWKS_URI` env var.

#### Scenario: Seed with Rezics flag
- **WHEN** the seed script runs with `DISPATCH_SEED_REZICS=true` and `DISPATCH_RECEIPT_SECRET` is set
- **THEN** a project with id `"rezics"` and verification `"audited"` is created (or updated if it exists)

#### Scenario: Seed without Rezics flag
- **WHEN** the seed script runs without `DISPATCH_SEED_REZICS=true`
- **THEN** no Rezics project is created

#### Scenario: Missing receipt secret
- **WHEN** `DISPATCH_SEED_REZICS=true` but `DISPATCH_RECEIPT_SECRET` is not set
- **THEN** the seed script exits with an error message

### Requirement: Rezics access policy seed
The hub seed script SHALL create an access policy for Rezics when seeding the Rezics project. The policy SHALL match issuer `"rezics-server"`, claim field `"sub"`, claim pattern `".*"` (all authenticated users), with `projectScope: null` (global access).

#### Scenario: Access policy created
- **WHEN** the Rezics project is seeded
- **THEN** an access policy is created with `issPattern: "rezics-server"`, `claimField: "sub"`, `claimPattern: ".*"`, `projectScope: null`

#### Scenario: Idempotent re-seed
- **WHEN** the seed script runs twice with `DISPATCH_SEED_REZICS=true`
- **THEN** the project and policy are upserted (no duplicates created)
