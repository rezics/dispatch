## ADDED Requirements

### Requirement: ResolvedIdentity type
The system SHALL define a `ResolvedIdentity` type with fields: `sub` (string), `isRoot` (boolean), `permissions` (string[]), `projects` (string[] | "*"), and `claims` (the original JWT payload).

#### Scenario: Type is importable
- **WHEN** a module imports `ResolvedIdentity` from the auth module
- **THEN** it has access to all identity fields with correct types

### Requirement: Identity resolution pipeline
The hub SHALL resolve identity from a verified JWT through the following steps in order:
1. Extract `sub` and `iss` from verified JWT claims
2. Look up `sub` in the User table — if found and `isRoot` is true, return identity with all permissions and `projects: "*"`
3. Load all TrustPolicy rows (from cache if available)
4. For each policy: check if JWT `iss` matches `issPattern` (glob) AND JWT claim at `claimField` matches `claimPattern` (regex)
5. Union the `permissions` arrays from all matching policies
6. Resolve project scope: for each matching policy, if `projectScope` is null, set projects to `"*"`; if `projectScope` names a claim field, extract that claim's value and add it to the projects list
7. Return `ResolvedIdentity` with the unioned permissions and resolved project scope

#### Scenario: Root user resolution
- **WHEN** a JWT with `sub: "root-001"` is verified and `root-001` exists in the User table with `isRoot: true`
- **THEN** the resolved identity has `isRoot: true`, all permissions, and `projects: "*"`

#### Scenario: Policy-based resolution
- **WHEN** a JWT with `iss: "auth.rezics.com"`, `role: "user"`, `project: "book-crawler"` is verified, and a policy matches with `permissions: ["worker:register", "task:claim"]` and `projectScope: "project"`
- **THEN** the resolved identity has `permissions: ["worker:register", "task:claim"]`, `projects: ["book-crawler"]`, `isRoot: false`

#### Scenario: Multiple policies match
- **WHEN** a JWT matches two policies, one granting `["dashboard:view"]` and another granting `["worker:register"]`
- **THEN** the resolved identity has `permissions: ["dashboard:view", "worker:register"]` (union)

#### Scenario: No policies match
- **WHEN** a JWT is verified but no policies match and the sub is not in the User table
- **THEN** the resolved identity has empty permissions and empty projects

### Requirement: Session-based identity resolution
The hub SHALL also resolve identity from a session token by looking up the Session table, finding the associated User, and then running the same resolution logic (User table check for root status). Session-based identities SHALL carry the permissions that were granted at login time or re-resolve from the User table.

#### Scenario: Session resolves to root identity
- **WHEN** a session token belongs to a root user
- **THEN** the resolved identity has `isRoot: true` and all permissions

### Requirement: Dual auth resolution
The auth middleware SHALL check for identity in this order:
1. `Authorization: Bearer <token>` header — if present, verify as JWT and resolve via the policy pipeline
2. Session cookie — if present, look up session and resolve identity
3. If neither is present, return HTTP 401

#### Scenario: Bearer takes precedence
- **WHEN** both a Bearer token and session cookie are present
- **THEN** the Bearer token is used for identity resolution

#### Scenario: Session fallback
- **WHEN** no Bearer token is present but a valid session cookie exists
- **THEN** the session is used for identity resolution
