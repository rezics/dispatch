## Why

Phases 1–8 deliver a fully functional system — hub, worker SDK, plugins, dashboards — but it's accessible only to developers comfortable with CLI and npm. The desktop app opens dispatch to non-technical community contributors who can donate compute with a single download. Meanwhile, the system has no production hardening: no load testing, no table partitioning for 100M+ tasks, no retention cleanup, and no deployment documentation. This final change makes the project both accessible and production-ready.

## What Changes

- Create `worker-tauri` desktop app package:
  - Tauri (Rust) shell wrapping the worker binary as a sidecar
  - System tray icon with live task count and status indicator
  - Guided first-run setup screen (hub URL + token)
  - Auto-updater via Tauri's built-in updater
  - WebView renders worker-dashboard connected to local API
  - Compile `dispatch-worker` to standalone binary via `bun build --compile`
- Create GitHub Actions release pipeline:
  - Build for Windows (.exe), macOS (.dmg), Linux (.deb)
  - Upload artifacts to GitHub Releases
- Production hardening on the hub:
  - Load testing tooling targeting 10M tasks / 100 concurrent workers
  - Task table partitioning strategy by `created_at` (monthly)
  - Configurable retention cleanup job for completed/failed tasks
- Documentation and deployment:
  - Full README with getting started guide
  - Docker Compose for one-command hub + PostgreSQL deployment
  - Architecture diagrams and API quick reference

## Capabilities

### New Capabilities

- `tauri-shell`: Tauri Rust shell — sidecar worker binary management, system tray, auto-updater, WebView integration
- `tauri-setup`: Guided first-run setup screen — hub URL input, token configuration, local config persistence
- `tauri-release`: GitHub Actions CI/CD pipeline for cross-platform Tauri builds and GitHub Releases distribution
- `worker-binary`: Compile dispatch-worker to standalone binary via `bun build --compile`
- `task-partitioning`: PostgreSQL task table partitioning by `created_at` for large-scale deployments
- `task-retention`: Configurable cleanup job for old completed/failed tasks (retention period, batch size, schedule)
- `load-testing`: Load testing suite targeting 10M tasks with 100 concurrent workers
- `deployment-docs`: README, getting started guide, Docker Compose, architecture diagrams

### Modified Capabilities

(none — all additive, no spec-level changes to existing capabilities)

## Impact

- **New package**: `package/worker-tauri/` (Tauri app, not published to npm — GitHub Releases only)
- **New CI/CD**: `.github/workflows/` for Tauri build + release pipeline
- **New dependencies (tauri)**: Rust toolchain, Tauri CLI, `tauri` crate, `tauri-plugin-updater`
- **Modified package**: `package/hub/` — adds partitioning migration, retention cleanup job, new env vars for retention config
- **New files**: `docker-compose.yml` (updated), `README.md`, docs
- **Database**: Adds partitioned task table migration (requires careful migration for existing data)
- **Build tooling**: `bun build --compile` for worker binary output
