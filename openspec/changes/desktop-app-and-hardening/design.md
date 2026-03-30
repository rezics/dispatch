## Context

Phases 1–8 are complete: hub server, worker SDK, WebSocket mode, trust verification, result plugins, official domain plugins, i18n, shared UI, and both dashboards. The system works end-to-end for developers who can run `bun` from a terminal. This final change bridges two gaps: (1) a desktop app so non-technical users can contribute compute, and (2) production hardening so the system can handle 100M+ tasks reliably.

## Goals / Non-Goals

**Goals:**

- Ship a cross-platform desktop app (Windows, macOS, Linux) via Tauri that wraps the worker as a sidecar binary
- Provide a guided first-run experience (hub URL + token) so non-technical users can get started
- Set up a GitHub Actions pipeline that builds and publishes Tauri binaries to GitHub Releases
- Add task table partitioning for PostgreSQL to handle 100M+ rows without performance degradation
- Add a configurable retention cleanup job for old completed/failed tasks
- Validate the system under load (10M tasks, 100 workers)
- Ship comprehensive documentation: README, getting started guide, Docker Compose

**Non-Goals:**

- Mobile apps (iOS/Android) — desktop only
- App store distribution (Microsoft Store, Mac App Store) — GitHub Releases only
- Paid features or license gating
- Horizontal hub scaling (multi-instance hub) — single hub instance, managed PG for scale
- Kubernetes deployment manifests — Docker Compose only for this phase

## Decisions

### 1. Tauri v2 for the desktop shell

**Choice**: Tauri v2 over Electron.

**Rationale**: Tauri produces dramatically smaller binaries (~10MB vs ~150MB for Electron). It uses the OS native webview rather than bundling Chromium. The Rust backend is minimal — just sidecar management, tray icon, and auto-updater. Tauri v2's plugin system provides built-in updater, shell, and notification APIs.

**Alternatives considered**:
- Electron: Massive bundle size, overkill for a thin shell.
- Neutralinojs: Lighter than Electron but less mature, weaker update infrastructure.
- Wails (Go): Good option but adds Go to the toolchain; Tauri's Rust is already established in the plan.

### 2. Worker as Tauri sidecar via `bun build --compile`

**Choice**: Compile the dispatch-worker to a standalone binary using `bun build --compile --minify` and bundle it as a Tauri sidecar.

**Rationale**: Sidecar is a first-class Tauri concept — the binary is bundled, spawned on app launch, and killed on app close. Users don't need Bun or Node installed. The compiled binary includes all dependencies. The worker exposes its local HTTP API on `localhost:45321` which the WebView (worker-dashboard) connects to.

### 3. Monthly range partitioning for the task table

**Choice**: Partition the `task` table by `created_at` using PostgreSQL declarative range partitioning with monthly partitions.

**Rationale**: At 100M tasks, a single unpartitioned table degrades on index maintenance and vacuum. Monthly partitions allow dropping old months cleanly (instead of row-by-row DELETE), keep each partition under ~10M rows, and maintain index efficiency. The `SKIP LOCKED` claim query works across partitions.

**Alternatives considered**:
- Hash partitioning by project: Doesn't help with time-based cleanup.
- List partitioning by status: Skews heavily (most tasks are done/failed).
- No partitioning + DELETE: DELETE of millions of rows causes vacuum pressure and lock contention.

### 4. Retention cleanup as a hub reaper extension

**Choice**: Add task retention cleanup to the existing reaper loop rather than a separate process.

**Rationale**: The reaper already runs on a configurable interval and handles periodic maintenance (expired leases, nonce cleanup). Adding retention cleanup keeps the operational model simple — one background loop handles all maintenance. Configuration: `TASK_RETENTION_DAYS` (default 30), `TASK_RETENTION_BATCH_SIZE` (default 10000).

### 5. k6 for load testing

**Choice**: Use k6 (Grafana) for load testing.

**Rationale**: k6 scripts are JavaScript (familiar to this project's TypeScript developers), it supports HTTP and WebSocket protocols, and it generates standard metrics. The test scenario: seed 10M tasks, run 100 virtual workers claiming in parallel, measure throughput and p99 latency.

**Alternatives considered**:
- Custom Bun script: Works but reinvents metric collection and reporting.
- Artillery: YAML config is less flexible than k6's JS scripting.
- Locust (Python): Adds a Python dependency to a TypeScript project.

### 6. Tauri auto-updater via GitHub Releases

**Choice**: Use Tauri's built-in updater plugin pointing to GitHub Releases as the update endpoint.

**Rationale**: Tauri v2 has native support for checking GitHub Releases for updates. The CI pipeline publishes signed binaries; the app checks for updates on launch and periodically. No custom update server needed.

### 7. Docker Compose with named volumes

**Choice**: `docker-compose.yml` runs hub + PostgreSQL with a named volume for PG data persistence.

**Rationale**: One-command deployment for self-hosters: `docker compose up -d`. Named volume survives `docker compose down`. The hub image is built from a Dockerfile that includes the compiled hub binary and embedded dashboard.

## Migration Plan

### Task table partitioning

1. Create new partitioned table `task_partitioned` with identical schema + monthly partitions
2. Copy existing data from `task` to `task_partitioned` in batches (to avoid long locks)
3. Rename `task` → `task_legacy`, `task_partitioned` → `task`
4. Update foreign keys and indexes
5. Validate, then drop `task_legacy` after confirmation period

This is a one-time migration. Future months are auto-created by a partition maintenance function that runs in the reaper loop.

**Rollback**: Rename tables back. No data loss since `task_legacy` is retained.

## Risks / Trade-offs

- **[Tauri sidecar binary size]** → The compiled Bun binary is ~50–80MB. Combined with Tauri shell (~10MB), total app is ~60–90MB. Mitigation: acceptable for a desktop app; `bun build --minify` reduces size; auto-updater delivers delta updates.

- **[Cross-platform CI complexity]** → Building for 3 platforms requires GitHub Actions matrix with macOS, Windows, and Linux runners. macOS code signing requires an Apple Developer certificate. Mitigation: Tauri's official CI template handles most of this; signing can be deferred to a follow-up.

- **[Partition migration on existing data]** → Migrating a large task table to partitioned format requires downtime or careful batching. Mitigation: the migration plan uses batched copies and table renames to minimize lock time. For new deployments, partitioning is the default.

- **[k6 requires separate installation]** → k6 is not a Bun/npm package. Mitigation: load tests include a `Dockerfile` with k6 pre-installed, and the README documents installation.

## Open Questions

- Should the Tauri app support multiple hub connections (multi-hub mode) or only a single hub? (Recommendation: single hub for v1, multi-hub as a future feature.)
- Should the partition maintenance auto-create partitions N months ahead? (Recommendation: yes, create 3 months ahead to avoid missing partition errors.)
- Should macOS code signing be included in the initial release or deferred? (Recommendation: defer — unsigned apps work with Gatekeeper bypass; signing requires a paid Apple Developer account.)
