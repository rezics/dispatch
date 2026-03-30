## ADDED Requirements

### Requirement: GitHub Actions CI builds for all platforms
A GitHub Actions workflow SHALL build the Tauri app for Windows (x64), macOS (x64, ARM64), and Linux (x64) on every push to a release tag (e.g., `v*`).

#### Scenario: Tag triggers build
- **WHEN** a tag matching `v*` is pushed
- **THEN** the CI pipeline builds Tauri binaries for all 3 platforms

### Requirement: Artifacts uploaded to GitHub Releases
The CI pipeline SHALL create a GitHub Release from the tag and upload all platform binaries (.exe, .dmg, .deb) as release assets.

#### Scenario: Release published
- **WHEN** all platform builds succeed
- **THEN** a GitHub Release is created with all binaries attached and release notes from the tag

### Requirement: Build pipeline compiles worker binary first
The CI pipeline SHALL execute the build steps in order: (1) `bun build --compile --minify` the worker binary, (2) build the worker-dashboard, (3) run `tauri build` with the sidecar and dashboard assets.

#### Scenario: Correct build order
- **WHEN** the CI pipeline runs
- **THEN** the worker binary is compiled before the Tauri build step that expects it as a sidecar

### Requirement: Updater manifest generated
The CI pipeline SHALL generate and publish a Tauri updater manifest (`latest.json`) alongside the release assets, enabling the auto-updater to detect new versions.

#### Scenario: Updater manifest present
- **WHEN** a release is published
- **THEN** `latest.json` is available at the release URL with version, platform URLs, and signatures

### Requirement: CI caches Rust and Bun dependencies
The CI pipeline SHALL cache Cargo dependencies and Bun node_modules to speed up builds.

#### Scenario: Cached build faster
- **WHEN** the second build runs with no dependency changes
- **THEN** the Rust compilation and Bun install steps use cached artifacts
