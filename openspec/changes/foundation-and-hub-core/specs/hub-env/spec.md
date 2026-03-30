## ADDED Requirements

### Requirement: Type-safe environment via t3-env
The hub SHALL validate all environment variables at startup using `@t3-oss/env-core` with Zod schemas. Missing or invalid variables cause immediate startup failure with a clear error message.

#### Scenario: Missing DATABASE_URL fails startup
- **WHEN** the hub starts without `DATABASE_URL` set
- **THEN** the process exits with an error message identifying the missing variable

#### Scenario: Valid environment starts cleanly
- **WHEN** all required environment variables are set correctly
- **THEN** the hub starts without environment validation errors

### Requirement: Required environment variables
The hub SHALL require: `DATABASE_URL` (valid URL string).

#### Scenario: DATABASE_URL validated as URL
- **WHEN** `DATABASE_URL` is set to `not-a-url`
- **THEN** startup fails with a validation error

### Requirement: Optional environment variables with defaults
The hub SHALL accept optional variables with defaults: `PORT` (number, default 3721), `NODE_ENV` (enum `development` | `production`, default `development`), `REAPER_INTERVAL` (string, default `"30s"`), `DISPATCH_DISABLE_DASHBOARD` (boolean, default `false`).

#### Scenario: Default port used
- **WHEN** `PORT` is not set
- **THEN** the hub listens on port 3721

#### Scenario: Custom port
- **WHEN** `PORT=8080` is set
- **THEN** the hub listens on port 8080

### Requirement: .env file loading
Bun SHALL load `.env.development` in development mode and `.env.production` in production mode. The `env.ts` module exports a single typed `env` object used throughout the hub.

#### Scenario: Development env loaded
- **WHEN** the hub runs with `NODE_ENV=development`
- **THEN** variables from `.env.development` are loaded

#### Scenario: Production env loaded
- **WHEN** the hub runs with `NODE_ENV=production`
- **THEN** variables from `.env.production` are loaded
