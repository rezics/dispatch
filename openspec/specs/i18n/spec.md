## ADDED Requirements

### Requirement: typesafe-i18n package with English default
The `@rezics/dispatch-i18n` package SHALL use typesafe-i18n with English (`en`) as the default and base locale. All translation keys SHALL be type-checked at compile time.

#### Scenario: Import translations
- **WHEN** a dashboard imports `{ LL }` from `@rezics/dispatch-i18n`
- **THEN** all translation keys are available with full TypeScript autocomplete

#### Scenario: Missing key is compile error
- **WHEN** a dashboard uses `LL.nonExistent()`
- **THEN** the TypeScript compiler reports a type error

### Requirement: Translation keys cover dashboard strings
The i18n package SHALL define translation keys for all user-facing strings in both dashboards, organized by namespace: `hub.*` (hub-dashboard), `worker.*` (worker-dashboard), `common.*` (shared strings like status labels, time formatting).

#### Scenario: Common status labels
- **WHEN** `LL.common.status.pending()` is called
- **THEN** it returns `'Pending'` in English

#### Scenario: Hub dashboard strings
- **WHEN** `LL.hub.overview.title()` is called
- **THEN** it returns the localized overview page title

### Requirement: Parameterized translations
The i18n package SHALL support parameterized translations for dynamic values (counts, names, dates).

#### Scenario: Task count message
- **WHEN** `LL.hub.overview.taskCount({ count: 42 })` is called
- **THEN** it returns `'42 tasks'` (or locale-appropriate equivalent)

### Requirement: Locale loading is async
Additional locales beyond the default SHALL be loadable asynchronously to avoid bundling all translations upfront.

#### Scenario: Load Japanese locale
- **WHEN** a user selects Japanese and the locale is loaded via `loadLocale('ja')`
- **THEN** all subsequent `LL` calls return Japanese translations

### Requirement: Generated types are exported
The auto-generated `i18n-types.ts` and `i18n-util.ts` SHALL be exported from the package so dashboards can import the type-safe locale utilities.

#### Scenario: Dashboard imports utilities
- **WHEN** a dashboard imports `{ loadLocale, setLocale }` from `@rezics/dispatch-i18n`
- **THEN** the imports resolve and the functions are typed
