## Context

`@rezics/dispatch-i18n` currently uses `typesafe-i18n`:

- Catalog at `src/i18n/en/index.ts` (TypeScript literal object)
- Type generation via `typesafe-i18n` codegen → `src/i18n/i18n-types.ts`, `i18n-util.ts`, `i18n-util.async.ts`, `i18n-util.sync.ts`, `formatters.ts`
- Runtime entry: `loadLocale(locale)`, `i18nObject(locale)` returns the `LL` proxy
- Consumer integration (`hub-dashboard/src/i18n.ts`): a tiny wrapper that calls `loadLocale('en')` at import time and exposes `useLL()` returning the current `LL`
- Call sites: `LL.common.status.running()`, `LL.hub.overview.title()`, etc. — nested object paths, English-only at runtime today

`@rezics/i18n` (the sibling app-level package in the rezics monorepo) uses `paraglide-js`:

- Catalog at `messages/<locale>.json` per locale, with snake_case keys (e.g., `accessibility_close`, `attribution_credit_role_actor`)
- `project.inlang/settings.json` lists locales, format, base locale
- Compile step (`paraglide-js compile --project ./project.inlang --outdir ./src/paraglide --emit-ts-declarations`) emits per-message `.js` + `.d.ts` files under `src/paraglide/messages/` plus a barrel and `runtime.js`
- Exports: `.` (curated re-exports), `./messages` (`* as m` from compiled messages), `./runtime` (`baseLocale`, `getLocale`, `setLocale`, `locales`), `./react` (React-aware hook)
- Call sites: `m.accessibility_close()`, `m.attribution_credit_role_actor()` — flat snake_case access, tree-shakeable

The dispatch usage surface is bounded: 13 files, 179 call sites, all English today.

## Goals / Non-Goals

**Goals:**

- Replace the `typesafe-i18n` engine with `paraglide-js` inside `@rezics/dispatch-i18n` while preserving the package name and the two-tier i18n architecture.
- Align the package's exports map and runtime API with `@rezics/i18n` so dispatch and rezics consumers have the same mental model.
- Codemod the 179 call sites mechanically: `LL.<dot.path>(args)` → `m.<snake_case_key>(args)`, with snake_case derived from the previous dot path (e.g., `common.status.running` → `common_status_running`).
- Keep the package useful for adding additional locales later without further refactor.

**Non-Goals:**

- Adding Japanese, Traditional Chinese, or any non-English locale. English-only at migration time; the structure supports multi-locale but the migration does not introduce new locales.
- Touching `@rezics/ui` or its `/i18n` export. Ui-internal i18n (button labels inside `@rezics/ui` components) is fully owned by `@rezics/ui`; dispatch does not consume or modify it.
- Changing the React integration model beyond what is needed for `m.*` calls. No React Context provider is added unless reactivity requires it (see Decision 4).
- SSR / locale negotiation / cookie-based persistence — dispatch dashboards are CSR SPAs.

## Decisions

### 1. Mirror `@rezics/i18n` exports map exactly

**Choice**: `@rezics/dispatch-i18n` `package.json` `exports` declares:

```json
{
  ".":         { "types": "./src/index.ts",                       "default": "./src/index.ts" },
  "./messages":{ "types": "./src/paraglide/messages.d.ts",        "default": "./src/paraglide/messages.js" },
  "./runtime": { "types": "./src/paraglide/runtime.d.ts",         "default": "./src/paraglide/runtime.js" },
  "./react":   { "types": "./src/react.ts",                       "default": "./src/react.ts" }
}
```

`src/index.ts` re-exports the curated public surface: `export * as m from "./paraglide/messages.js"` + selected `runtime` re-exports (`baseLocale`, `getLocale`, `locales`, `setLocale`).

**Why**: alignment is the entire point. Identical exports shape means any rezics-family contributor coming from `@rezics/i18n` reads dispatch code the same way.

**Alternative considered**: a custom shape ergonomic to dispatch. Rejected — divergence is the cost we are removing.

### 2. Message naming: flat snake_case with category prefix

**Choice**: messages are named `<category>_<sub>_<leaf>`, e.g., `common_status_running`, `hub_overview_title`, `hub_tasks_dialog_create_title`, `worker_tasks_empty_state`, `ui_password_label`. Categories preserve the namespace semantics that `typesafe-i18n` previously expressed via dot paths.

**Why**: paraglide messages live in a flat namespace; snake_case is the rezics-established convention (see `../rezics/package/i18n/src/paraglide/messages/`). Category prefix keeps grep ergonomic and makes it obvious which area a key belongs to.

**Naming derivation rule** (applied mechanically during codemod):
- `LL.common.status.running()` → `m.common_status_running()`
- `LL.hub.overview.taskCount({ count: 42 })` → `m.hub_overview_task_count({ count: 42 })`
- camelCase segments are lowercased and joined with underscores (`taskCount` → `task_count`)

**Alternative considered**: keep nested dot-paths through a wrapper. Rejected — adds an indirection layer that fights paraglide's tree-shaking and obscures the actual keys.

### 3. Catalog format: JSON per locale under `messages/`

**Choice**: `messages/en.json` (and future `ja.json`, `zh-hant.json`, …) keyed by snake_case message name; `project.inlang/settings.json` lists locales and points the compiler at the messages directory.

**Why**: matches `@rezics/i18n`'s setup exactly; JSON is the inlang ecosystem's first-class catalog format with editor / Sherlock / web-app tooling support.

**Catalog migration**: a one-time script (or hand conversion if simpler given the small catalog) walks the existing `src/i18n/en/index.ts` TypeScript literal, flattens dot paths to snake_case keys, and emits `messages/en.json`. The conversion preserves every existing string verbatim (including parameter syntax — paraglide and typesafe-i18n both support `{count}` interpolation, so most strings transfer unchanged; any ICU plural syntax is normalized to paraglide's `{count, plural, ...}` form).

### 4. React integration: thin `./react` export, no Context provider

**Choice**: `./react` exports a `useLocale()` hook that returns the current locale and a `setLocale()` action. Call sites consume `m.*` directly — they do not need a hook to access translated strings, because `m.*()` reads the current locale at call time from the paraglide runtime. The hook exists only to trigger re-render when `setLocale()` changes the locale.

**Why**: paraglide's runtime tracks the current locale globally; messages are not parameterized by a hook-returned `LL` object. The existing `useLL()` wrapper in `hub-dashboard/src/i18n.ts` only existed because typesafe-i18n returned a frozen `LL` per locale; paraglide doesn't need it.

**Migration of `useLL()` call sites**: existing `const LL = useLL()` followed by `LL.foo.bar()` is rewritten as direct `m.foo_bar()` calls (no hook needed). If the component must re-render on locale change (a language switcher's children), it subscribes via `useLocale()` and discards the return value — its presence is enough to register the component as a locale subscriber.

**Alternative considered**: Context-based provider wrapping `<App>`. Rejected — paraglide's global runtime is sufficient for CSR SPAs and is what `@rezics/i18n/react` already does.

### 5. Catalog migration is hand-converted, not automated

**Choice**: the catalog is small enough (one English locale, the entire dispatch app surface) that a developer converts `src/i18n/en/index.ts` to `messages/en.json` by hand or with a one-off script. No production tooling for ongoing catalog conversion is built.

**Why**: build-once tooling adds maintenance burden for a transformation that runs exactly once. The 179 call-site codemod is the larger task; a 200-line JSON migration is throwaway work.

### 6. Existing `LL.*` call sites are rewritten by codemod, not aliased

**Choice**: rewrite each `LL.<dot.path>(args?)` to `m.<snake_case_key>(args?)`. Do not introduce a shim object that exposes an `LL.*` interface backed by `m.*` calls.

**Why**: a shim would let the migration "land" without touching call sites, but it permanently embeds the `LL` mental model in dispatch — exactly what this change exists to remove. Codemod-once is cheaper than maintaining a compatibility layer.

**Codemod approach**: per-file find-and-replace using the mapping derived from the catalog (each existing dot path → its snake_case key). For 179 sites across 13 files, this is achievable in a single pass.

### 7. No new locales in this change

**Choice**: ship English only. `project.inlang/settings.json` lists `en` as the only locale; the catalog has `messages/en.json` only.

**Why**: the migration's value is in the engine swap and the alignment with `@rezics/i18n`. Adding locales conflates two concerns. Once paraglide is in place, adding `ja.json` or `zh-hant.json` is a one-locale-at-a-time follow-up with no further engineering work in dispatch beyond the catalog itself.

## Risks / Trade-offs

- **[Call-site codemod miss]** A `LL.foo.bar()` that isn't in the catalog (typo or dead code reference) becomes `m.foo_bar()` and fails at compile time → **Mitigation**: paraglide emits typed message functions; TypeScript catches missing keys during the typecheck step after codemod. Treat as a feature, not a bug.
- **[Interpolation syntax drift]** typesafe-i18n's `{count|plural}` and paraglide's `{count, plural, ...}` differ; a hand-conversion can mis-translate plural rules → **Mitigation**: most dispatch strings use simple interpolation (`{count}` style); plural rules are rare and reviewed individually during catalog migration.
- **[Build pipeline coupling]** The `@rezics/dispatch-i18n` `dev` and `build` scripts must run `paraglide-js compile` before consumers read the compiled output → **Mitigation**: mirror the `@rezics/i18n` script setup; `bun run compile` is idempotent and re-runnable; consumer dashboards' `bun install` includes the workspace dependency so the compile runs at install time.
- **[`useLL()` removal touches more files than expected]** Components that hold `LL` in local state or pass it down via props will need restructuring → **Mitigation**: enumeration during P3 of `tasks.md`; if a component truly needs the legacy shape, it can call `m.*` inside its render without using a hook at all.
- **[Locale change reactivity in language switchers]** Without a Context provider, components must subscribe explicitly via `useLocale()` to re-render on `setLocale()` → **Trade-off accepted**: dispatch ships English only post-migration, so this is a latent concern; a future locale-switcher implementation adds `useLocale()` calls at the consumption points.
- **[Companion change ordering]** `adopt-rezics-ui-foundation` is independent but touches some of the same files (pages that import both shadcn primitives and `LL.*`) → **Mitigation**: the two changes' edits are on different lines (import lines vs body); merge conflict resolution is mechanical. Either change can land first.

## Migration Plan

Phased rollout within a single change/PR. Each phase is a logical commit boundary.

**P1 — Package build pipeline & dependencies**

1. In `package/i18n/package.json`: remove `typesafe-i18n`; add `@inlang/paraglide-js` to `devDependencies`; add `scripts`: `compile`, `dev`, `build` modeled on `@rezics/i18n`.
2. Create `package/i18n/project.inlang/settings.json` declaring `baseLocale: "en"`, `locales: ["en"]`, the messages source directory.
3. Update `package/i18n/package.json` `exports` to the new four-entry map (`.`, `./messages`, `./runtime`, `./react`).
4. Add `package/i18n/src/react.ts` (a thin `useLocale` re-export pattern from paraglide's runtime).
5. Re-author `package/i18n/src/index.ts` to re-export `* as m from "./paraglide/messages.js"` and the curated runtime helpers.

**P2 — Catalog migration**

6. Convert `package/i18n/src/i18n/en/index.ts` (typesafe-i18n TS literal) to `package/i18n/messages/en.json`. Flatten dot paths to snake_case keys. Normalize any plural / interpolation syntax differences.
7. Delete `package/i18n/src/i18n/` directory (the typesafe-i18n catalog + generated types).
8. Run `bun -F @rezics/dispatch-i18n compile`; verify `package/i18n/src/paraglide/messages.js`, `messages.d.ts`, `runtime.js`, `runtime.d.ts` are emitted and the per-message files appear under `src/paraglide/messages/`.

**P3 — Consumer codemod**

9. Generate the `LL → m` mapping from the catalog conversion (each dot path → its snake_case key).
10. Walk the 13 consumer files; for each `LL.<path>()` call, rewrite to `m.<key>()`. Update imports: `import { useLL } from './i18n'` → `import * as m from '@rezics/dispatch-i18n/messages'` (or named imports if preferred).
11. Update `hub-dashboard/src/i18n.ts` and `worker-dashboard/src/i18n.ts` to consume the new runtime: remove the `useLL()` wrapper, remove `i18nObject` calls, expose `setLocale` from the new runtime if a switcher is wired up.

**P4 — Verify**

12. `bun run typecheck` (or equivalent) — paraglide's emitted `.d.ts` catches any missing keys.
13. Dev-server smoke test both dashboards: verify all visible strings render and match the prior English copy.
14. Search for any remaining `LL.` or `typesafe-i18n` references in dispatch source; remove.

**Rollback strategy**

Reverting the merge commit restores the prior `typesafe-i18n` machinery and call sites. No persistent state, no contract change, no migration of user data. Consumers (workers, CLI, server) are untouched.

## Open Questions

- **Catalog conversion script vs hand conversion**: depends on the final size of the English catalog. If under ~150 keys, hand-convert during P2; otherwise write a one-off Bun script. Decided in implementation.
- **Should `./react` expose more than `useLocale()`?** The `@rezics/i18n/react` surface is the model — match whatever it exposes when this change is implemented (re-check at implementation time).
- **`hub-dashboard/src/i18n.ts` future role**: after migration, the file's only job is to call `setLocale('en')` at boot. Consider deleting it and inlining the call into `main.tsx`. Not a blocker; cosmetic.
- **CI compile-step gate**: should `bun run check` (or equivalent) include `paraglide-js compile` to detect catalog/codemap drift? Recommendation: yes, but enforcement is a follow-up.
