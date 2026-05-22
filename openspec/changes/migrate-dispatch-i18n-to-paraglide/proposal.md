## Why

`@rezics/dispatch-i18n` is the app-level i18n package for dispatch dashboards, currently powered by `typesafe-i18n` (TypeScript-literal catalogs, runtime locale loading via `loadLocale()`/`i18nObject()`). The sibling rezics monorepo's app-level package `@rezics/i18n` is powered by `paraglide-js` (JSON catalogs per locale, compile-time message generation, tree-shakeable per-message imports), exposing `./messages`, `./runtime`, and `./react` entry points. Aligning dispatch on the same i18n engine and exports shape removes a divergence between sibling family products: shared mental model, shared tooling, and the rezics two-tier architecture (`@rezics/i18n` at app level + `@rezics/ui/i18n` at ui-internal level) maps one-to-one to dispatch (`@rezics/dispatch-i18n` at app level + `@rezics/ui/i18n` for ui chrome).

This change preserves the package name, the package boundary, and the consumer call sites' high-level shape (replace `LL.common.status.running()` with `m.common_status_running()`). It does not touch UI primitives, CSS, or any non-i18n consumer code.

## What Changes

- **BREAKING** Replace `typesafe-i18n` with `@inlang/paraglide-js` inside `@rezics/dispatch-i18n`. The runtime API changes from `LL.<dot.path>()` to `m.<snake_case_key>()`.
- **BREAKING** Catalog format changes from TypeScript literals under `src/i18n/<locale>/` to JSON files under `messages/<locale>.json` driven by `project.inlang/settings.json`.
- **BREAKING** Message naming convention: flat snake_case with category prefix (e.g., `m.ui_password_label()`, `m.common_status_running()`, `m.hub_overview_title()`, `m.worker_tasks_empty_state()`). The category prefix encodes the namespace that `typesafe-i18n` previously expressed via dot-paths.
- **BREAKING** Package exports map adopts the `@rezics/i18n` shape: `.` (base helpers), `./messages` (compiled message catalog re-exported as `* as m`), `./runtime` (`baseLocale`, `getLocale`, `setLocale`, `locales`), `./react` (React-aware locale hook).
- Add `paraglide-js compile` to the package build; add a `dev`/`compile` script mirroring `@rezics/i18n`.
- Remove the `typesafe-i18n` dependency. Remove the existing `src/i18n/` runtime-loading machinery, `i18n-types.ts`, `i18n-util.ts`, `formatters.ts`.
- Codemod 13 consumer files / 179 call sites across `hub-dashboard` and `worker-dashboard`: `LL.foo.bar()` → `m.foo_bar()`; `useLL()` → `useLocale()` (or direct `m.*` calls); `loadLocale()` / `setLocale()` move to the runtime export.
- Update `hub-dashboard/src/i18n.ts` and `worker-dashboard/src/i18n.ts` (if present) to consume the new runtime; remove the wrapper that mimicked `LL` state.

## Capabilities

### New Capabilities

_None. This change re-grounds the existing `i18n` capability on a different engine; it does not introduce a new one._

### Modified Capabilities

- `i18n`: swap the engine from `typesafe-i18n` to `paraglide-js`; redefine the runtime API (`m.<snake_case_key>()`), the exports map (`. / ./messages / ./runtime / ./react`), the catalog format (JSON under `messages/`), and the message naming convention (snake_case with category prefix). The capability's purpose (app-level i18n for dispatch dashboards with type safety and locale switching) is unchanged.

## Impact

- **Affected packages**: `@rezics/dispatch-i18n` (engine swap, exports map, build pipeline).
- **Affected consumer files**: 13 files / 179 call sites across `package/hub-dashboard/src/` and `package/worker-dashboard/src/`. Includes pages, components, the `i18n.ts` integration module in each dashboard, and any `useLL()` hook callers.
- **New dependencies**: `@inlang/paraglide-js` (dev dep for the compile step), and the runtime imports from the compiled output (no separate npm runtime package — paraglide ships compiled code).
- **Removed dependencies**: `typesafe-i18n` from `@rezics/dispatch-i18n`.
- **Build pipeline**: `@rezics/dispatch-i18n` gains a `paraglide-js compile` step run via `bun run compile` (and chained from `dev`/`build`). Consumer dashboards do not need a build-step change beyond `bun install`.
- **Catalog migration**: the existing English-only `typesafe-i18n` catalog under `src/i18n/en/` is converted to `messages/en.json` with snake_case keys, preserving all current strings.
- **No runtime locale list expansion** — English remains the only locale loaded; the structural shift (single-locale → multi-locale-ready via `messages/<locale>.json`) is supported but additional locales are out of scope here.
- **No UI, no API, no contract changes**.

## Out of Scope

- Adding new locales (Japanese, Traditional Chinese, etc.) — separate change. This migration ships English only, matching the current dispatch state.
- Adopting any rezics i18n labels package or contract — `@rezics/contract` integration is independent.
- The `useLL()`-style React hook surface: a `./react` export is provided to align with `@rezics/i18n`, but call sites will use direct `m.*` calls where possible; existing `useLL()` consumers will be rewritten to `m.*` rather than wrapped behind a custom hook unless reactivity demands it. See `design.md` for the decision.
- Server-side rendering or locale negotiation from the browser — dispatch dashboards are CSR SPAs; no SSR is added here.

## Related Changes

- `adopt-rezics-ui-foundation` (independent companion change): replaces the CSS engine and primitive set across dispatch. The two changes do not depend on each other and may be sequenced in either order. The `@rezics/dispatch-i18n` package boundary is preserved by both; this change touches its engine, the other does not touch i18n at all.
