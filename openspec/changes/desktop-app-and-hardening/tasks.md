## 1. Worker Binary Compilation

- [ ] 1.1 Add build script to `package/worker/package.json`: `bun build --compile --minify ./src/index.ts --outfile dist/dispatch-worker`
- [ ] 1.2 Add `--config` CLI argument parsing to worker entry point for config file path
- [ ] 1.3 Support JSON config files as alternative to `worker.config.ts` (for Tauri use)
- [ ] 1.4 Verify compiled binary runs standalone on Linux, macOS, Windows without Bun installed
- [ ] 1.5 Verify local HTTP API (`localhost:45321`) works from compiled binary
- [ ] 1.6 Add binary size check — log size, verify under 100MB

## 2. Tauri App Scaffold

- [ ] 2.1 Scaffold `package/worker-tauri/` with Tauri v2 init: `src-tauri/` (Rust), `src/` (WebView), `package.json`
- [ ] 2.2 Configure `tauri.conf.json`: app name, identifier, sidecar declaration pointing to worker binary, window config
- [ ] 2.3 Add Rust dependencies: `tauri`, `tauri-plugin-updater`, `tauri-plugin-shell`
- [ ] 2.4 Implement `src-tauri/src/main.rs`: sidecar spawn on launch, kill on exit, tray icon setup
- [ ] 2.5 Configure sidecar binary path in Tauri config (platform-specific naming)

## 3. System Tray

- [ ] 3.1 Implement tray icon with status indicator: green (connected), red (disconnected), pulsing (processing)
- [ ] 3.2 Implement tray tooltip showing active task count (poll worker local API `/status`)
- [ ] 3.3 Implement tray menu: "Open Dashboard", "Settings", "Quit"
- [ ] 3.4 Implement tray click → open/focus dashboard window

## 4. Guided Setup Screen

- [ ] 4.1 Create setup page in WebView: hub URL input, token paste/file-import field
- [ ] 4.2 Implement hub URL validation: health check request on input
- [ ] 4.3 Implement JWT format validation (three base64 segments)
- [ ] 4.4 Implement config persistence: save to OS app data directory (`tauri::api::path::app_data_dir`)
- [ ] 4.5 Implement first-launch detection: show setup if no config exists, skip to dashboard otherwise
- [ ] 4.6 Implement Settings page accessible from tray menu and dashboard nav: re-open setup to change hub/token
- [ ] 4.7 Implement worker restart after config change

## 5. Tauri Auto-Updater

- [ ] 5.1 Configure `tauri-plugin-updater` with GitHub Releases endpoint
- [ ] 5.2 Implement update check on launch and every 6 hours
- [ ] 5.3 Implement update prompt dialog: version, release notes, "Install" / "Later" buttons
- [ ] 5.4 Test update flow: publish test release, verify app detects and installs update

## 6. WebView Dashboard Integration

- [ ] 6.1 Copy worker-dashboard build output into Tauri's `src/` (or configure Vite to output to Tauri dir)
- [ ] 6.2 Configure WebView to load worker-dashboard `index.html`
- [ ] 6.3 Set dashboard API base URL to `http://localhost:45321` for local sidecar communication
- [ ] 6.4 Verify dashboard renders correctly inside Tauri WebView (all pages, dark mode)

## 7. GitHub Actions Release Pipeline

- [ ] 7.1 Create `.github/workflows/release.yml` triggered on `v*` tags
- [ ] 7.2 Set up build matrix: macOS (x64 + ARM64), Windows (x64), Linux (x64)
- [ ] 7.3 Add build steps: install Rust, install Bun, compile worker binary, build worker-dashboard, `tauri build`
- [ ] 7.4 Add caching: Cargo registry, Bun node_modules
- [ ] 7.5 Upload build artifacts (.exe, .dmg, .deb) to GitHub Release
- [ ] 7.6 Generate and upload Tauri updater manifest (`latest.json`)
- [ ] 7.7 Test pipeline end-to-end: push test tag, verify all platform builds succeed and assets are uploaded

## 8. Task Table Partitioning

- [ ] 8.1 Create Prisma migration that converts `task` table to range-partitioned by `created_at` (monthly)
- [ ] 8.2 Implement rename-and-copy migration strategy: create `task_partitioned`, copy data in batches, rename tables
- [ ] 8.3 Create initial monthly partitions (current month + 3 months ahead)
- [ ] 8.4 Add partition maintenance to reaper loop: auto-create partitions 3 months ahead if missing
- [ ] 8.5 Verify `SKIP LOCKED` claim query works correctly across partitions
- [ ] 8.6 Verify all existing indexes (dispatch index, reaper index) work on partitioned table
- [ ] 8.7 Add integration test: insert tasks across multiple months, claim, verify correct routing

## 9. Task Retention Cleanup

- [ ] 9.1 Add `TASK_RETENTION_DAYS` (default 30) and `TASK_RETENTION_BATCH_SIZE` (default 10000) to hub env.ts
- [ ] 9.2 Implement retention cleanup in reaper loop: delete `done`/`failed` tasks older than retention period in batches
- [ ] 9.3 Implement cascading cleanup of `task_result` rows for deleted tasks
- [ ] 9.4 Implement partition-drop mode: drop entire partitions older than retention when table is partitioned
- [ ] 9.5 Implement disable via `TASK_RETENTION_DAYS=0`
- [ ] 9.6 Add info-level logging: count of tasks deleted or partitions dropped per cycle
- [ ] 9.7 Add integration tests: retention deletes old tasks, preserves recent tasks, respects batch size, cascade works

## 10. Load Testing

- [ ] 10.1 Create `test/load/` directory with k6 scripts and Dockerfile
- [ ] 10.2 Implement seed script: bulk insert N tasks via direct Prisma or batched API calls
- [ ] 10.3 Implement k6 test script: simulate M workers claiming/completing via HTTP Lease API
- [ ] 10.4 Add metrics collection: claim latency (p50/p95/p99), completion throughput (tasks/sec)
- [ ] 10.5 Add data integrity verification step: assert all tasks reached terminal status after test
- [ ] 10.6 Run baseline load test: 10M tasks, 100 workers, document results
- [ ] 10.7 Identify and document bottlenecks (if any) with recommendations

## 11. Documentation

- [ ] 11.1 Write `README.md`: project overview, architecture diagram (ASCII), feature list, package table
- [ ] 11.2 Write getting started section: Docker Compose start, create project, create tasks, run worker, view dashboard
- [ ] 11.3 Write environment variable reference: all hub + worker env vars with types, defaults, descriptions
- [ ] 11.4 Write API quick reference table: method, path, auth, description for all endpoints
- [ ] 11.5 Update `docker-compose.yml`: hub + PostgreSQL services, named volume, health checks, migration on startup
- [ ] 11.6 Create hub `Dockerfile`: multi-stage build, compile hub, include embedded dashboard, run migrations on start
- [ ] 11.7 Verify one-command deployment: `docker compose up -d` starts everything, dashboard accessible, data persists

## 12. End-to-End Verification

- [ ] 12.1 E2E: build Tauri app locally → first-run setup → worker connects to hub → tasks processed → dashboard shows progress
- [ ] 12.2 E2E: `docker compose up` → create project → seed tasks → run external worker → verify completion
- [ ] 12.3 E2E: load test at 1M tasks / 10 workers (smaller scale) → verify no data loss, acceptable latency
- [ ] 12.4 E2E: retention cleanup deletes old tasks after configured period
- [ ] 12.5 Verify auto-updater: publish mock release → app detects update → installs successfully
