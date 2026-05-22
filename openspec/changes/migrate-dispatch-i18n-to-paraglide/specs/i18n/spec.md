## MODIFIED Requirements

### Requirement: paraglide-js powers `@rezics/dispatch-i18n` with English as the base locale
The `@rezics/dispatch-i18n` package SHALL use `@inlang/paraglide-js` as the i18n engine with English (`en`) as the base and default locale. All translation keys SHALL be type-checked at compile time via paraglide's emitted `.d.ts` files. A `paraglide-js compile` step SHALL produce the runtime artifacts under `src/paraglide/`.

#### Scenario: Import messages
- **WHEN** a dashboard imports `m` from `@rezics/dispatch-i18n` (or `@rezics/dispatch-i18n/messages`)
- **THEN** every catalog key is exposed as a function with full TypeScript autocomplete and a typed parameter signature

#### Scenario: Missing key is compile error
- **WHEN** a dashboard calls `m.nonexistent_key()`
- **THEN** the TypeScript compiler reports a type error before runtime

#### Scenario: Compile artifacts present after build
- **WHEN** `bun -F @rezics/dispatch-i18n compile` runs successfully
- **THEN** `src/paraglide/messages.js`, `src/paraglide/messages.d.ts`, `src/paraglide/runtime.js`, `src/paraglide/runtime.d.ts`, and a per-message file for every catalog key under `src/paraglide/messages/` exist

### Requirement: Translation keys cover dashboard strings under snake_case category prefixes
The i18n package SHALL define translation keys for all user-facing strings in both dashboards. Keys SHALL be flat snake_case identifiers with a category prefix encoding the namespace: `common_*` (shared strings like status labels, time formatting), `hub_*` (hub-dashboard strings), `worker_*` (worker-dashboard strings), `ui_*` (UI chrome strings used by either dashboard).

#### Scenario: Common status labels
- **WHEN** `m.common_status_pending()` is called
- **THEN** it returns `"Pending"` in English

#### Scenario: Hub dashboard strings
- **WHEN** `m.hub_overview_title()` is called
- **THEN** it returns the localized overview page title

#### Scenario: Worker dashboard strings
- **WHEN** `m.worker_tasks_empty_state()` is called
- **THEN** it returns the localized empty-state message for the worker tasks page

#### Scenario: UI chrome string
- **WHEN** `m.ui_password_label()` is called
- **THEN** it returns the password field label string

### Requirement: Parameterized messages use paraglide's interpolation syntax
The catalog SHALL support parameterized translations using paraglide's `{name}` and `{name, plural, ...}` syntax. Compiled message functions SHALL accept a typed parameter object whose shape matches the placeholders in the message.

#### Scenario: Simple interpolation
- **WHEN** the catalog defines `hub_overview_task_count` as `"{count} tasks"` and a caller invokes `m.hub_overview_task_count({ count: 42 })`
- **THEN** the call returns `"42 tasks"` and the parameter object is typed as `{ count: number }`

#### Scenario: Missing required parameter is compile error
- **WHEN** a caller invokes `m.hub_overview_task_count()` without the `count` argument
- **THEN** the TypeScript compiler reports a type error

### Requirement: Locale switching via the paraglide runtime
Locale switching SHALL be performed via the runtime functions exported under `@rezics/dispatch-i18n/runtime`: `setLocale(locale)`, `getLocale()`, `baseLocale`, `locales`. Calling `setLocale` SHALL cause subsequent `m.*` calls to resolve against the new locale immediately. Components that need to re-render on locale change SHALL subscribe via the React hook exported from `@rezics/dispatch-i18n/react`.

#### Scenario: Switch to a non-base locale (post-migration capability)
- **WHEN** the catalog grows to include `messages/ja.json` and a user calls `setLocale("ja")`
- **THEN** all subsequent `m.*` calls return Japanese translations

#### Scenario: React component subscribes to locale changes
- **WHEN** a component calls `useLocale()` from `@rezics/dispatch-i18n/react`
- **THEN** the component re-renders when `setLocale()` is invoked elsewhere in the app

### Requirement: Package exports mirror `@rezics/i18n` shape
The `@rezics/dispatch-i18n` `package.json` `exports` map SHALL expose four entries: `.` (curated public surface re-exporting `* as m` and the runtime helpers), `./messages` (the paraglide-compiled message catalog), `./runtime` (the paraglide-compiled runtime), and `./react` (a React-aware locale hook). Each entry SHALL declare both `types` and `default` paths.

#### Scenario: Direct messages import
- **WHEN** a consumer imports `import * as m from "@rezics/dispatch-i18n/messages"`
- **THEN** the import resolves to the paraglide-emitted `src/paraglide/messages.js` with `.d.ts` types

#### Scenario: Runtime import
- **WHEN** a consumer imports `import { setLocale, getLocale } from "@rezics/dispatch-i18n/runtime"`
- **THEN** the imports resolve to the paraglide-emitted runtime functions

#### Scenario: React hook import
- **WHEN** a consumer imports `import { useLocale } from "@rezics/dispatch-i18n/react"`
- **THEN** the import resolves to the package's React-aware locale hook

## REMOVED Requirements

### Requirement: typesafe-i18n package with English default
**Reason**: replaced by `paraglide-js` to align with `@rezics/i18n` (the sibling app-level package in the rezics monorepo) and to gain tree-shakeable per-message imports.
**Migration**: see the "paraglide-js powers `@rezics/dispatch-i18n`" requirement above and `tasks.md` P1–P2 for the engine swap procedure.

### Requirement: Locale loading is async
**Reason**: paraglide compiles all locales into the bundle and does not require async loading; locale selection is a synchronous `setLocale(...)` call. Async loading is no longer the package's responsibility.
**Migration**: replace `loadLocale("xx")` followed by `i18nObject("xx")` with a single `setLocale("xx")` from `@rezics/dispatch-i18n/runtime`.

### Requirement: Generated types are exported
**Reason**: replaced by paraglide's automatic `.d.ts` emission alongside compiled messages. The package no longer re-exports separate `i18n-types.ts` / `i18n-util.ts` files; types ship via the `./messages` and `./runtime` exports' `types` paths.
**Migration**: existing `import type { TranslationFunctions } from "@rezics/dispatch-i18n"` and `import { loadLocale, setLocale } from "@rezics/dispatch-i18n"` are replaced by direct `m.*` typing and runtime imports under `@rezics/dispatch-i18n/runtime`.
