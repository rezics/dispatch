## 1. Package build pipeline and dependencies

- [ ] 1.1 In `package/i18n/package.json`, remove `typesafe-i18n` from `dependencies`
- [ ] 1.2 Add `@inlang/paraglide-js` to `devDependencies` (latest)
- [ ] 1.3 Add `scripts`: `"compile": "paraglide-js compile --project ./project.inlang --outdir ./src/paraglide --emit-ts-declarations"`, `"dev": "bun run compile"`, `"build": "bun run compile"` (model on `../rezics/package/i18n/package.json`)
- [ ] 1.4 Replace `package/i18n/package.json` `exports` with the four-entry map: `.`, `./messages`, `./runtime`, `./react` (each with `types` + `default`)
- [ ] 1.5 Create `package/i18n/project.inlang/settings.json` with `baseLocale: "en"`, `locales: ["en"]`, message source pointing at `../messages`
- [ ] 1.6 Run `bun install`; verify no stale references to `typesafe-i18n` remain in the lockfile

## 2. Catalog migration

- [ ] 2.1 Open `package/i18n/src/i18n/en/index.ts`; enumerate every dot-path leaf
- [ ] 2.2 Generate the snake_case key mapping for every dot path (`<category>.<sub>.<leaf>` → `category_sub_leaf`, camelCase → snake_case); record the mapping in a temp file for use in P3
- [ ] 2.3 Create `package/i18n/messages/en.json` keyed by the snake_case keys; copy each English string from the old catalog
- [ ] 2.4 Convert any interpolation syntax: simple `{name}` stays as-is; if any typesafe-i18n plural rules exist (`{count|plural}`), normalize to paraglide's `{count, plural, ...}` form
- [ ] 2.5 Delete `package/i18n/src/i18n/` directory (the typesafe-i18n catalog + generated types `i18n-types.ts`, `i18n-util.ts`, `i18n-util.async.ts`, `i18n-util.sync.ts`, `formatters.ts`)
- [ ] 2.6 Run `bun -F @rezics/dispatch-i18n compile`; verify `src/paraglide/messages.js`, `src/paraglide/messages.d.ts`, `src/paraglide/runtime.js`, `src/paraglide/runtime.d.ts`, and per-message files under `src/paraglide/messages/` are emitted
- [ ] 2.7 Re-author `package/i18n/src/index.ts`: `export * as m from "./paraglide/messages.js"`; `export { baseLocale, getLocale, locales, setLocale } from "./paraglide/runtime.js"`
- [ ] 2.8 Create `package/i18n/src/react.ts` exposing `useLocale` (modeled on `../rezics/package/i18n/src/react.ts`)

## 3. Consumer codemod — hub-dashboard

- [ ] 3.1 `package/hub-dashboard/src/i18n.ts`: remove the `useLL()` wrapper and `loadLocale('en')` boot call; replace with `setLocale(baseLocale)` from `@rezics/dispatch-i18n/runtime` (or delete the file and inline at boot if no other code lives here)
- [ ] 3.2 For each consumer file in `package/hub-dashboard/src/` that imports from `@rezics/dispatch-i18n` or calls `useLL()`: rewrite call sites using the P2 mapping (`LL.foo.bar()` → `m.foo_bar()`)
- [ ] 3.3 Update imports: `import { useLL } from './i18n'` → `import * as m from "@rezics/dispatch-i18n/messages"` (or named: `import { foo_bar } from "@rezics/dispatch-i18n/messages"`)
- [ ] 3.4 For components that previously held `LL` in local state or passed it as a prop: rewrite to call `m.*` at the consumption site directly; drop the prop or hook usage
- [ ] 3.5 If a component must re-render on locale change (e.g., a future language switcher's children), add `useLocale()` from `@rezics/dispatch-i18n/react`
- [ ] 3.6 grep the `hub-dashboard/src/` tree for any remaining `LL.` or `useLL(` reference; resolve

## 4. Consumer codemod — worker-dashboard

- [ ] 4.1 `package/worker-dashboard/src/i18n.ts` (if present): apply the same treatment as 3.1
- [ ] 4.2 For each consumer file in `package/worker-dashboard/src/`: rewrite call sites as in 3.2
- [ ] 4.3 Update imports as in 3.3
- [ ] 4.4 grep the `worker-dashboard/src/` tree for any remaining `LL.` or `useLL(` reference; resolve

## 5. Verify

- [ ] 5.1 Run `bun install` and confirm the lockfile stabilizes with `@inlang/paraglide-js` present and `typesafe-i18n` absent
- [ ] 5.2 Run `bun -F @rezics/dispatch-i18n compile` and confirm it succeeds
- [ ] 5.3 Run `tsc --noEmit` (or the project equivalent) across `package/i18n/`, `package/hub-dashboard/`, `package/worker-dashboard/`; confirm no type errors
- [ ] 5.4 Dev-server smoke test `hub-dashboard`: visit Login, Tasks, Overview, Users, Projects; verify every visible string renders and matches the prior English copy
- [ ] 5.5 Dev-server smoke test `worker-dashboard`: visit each page; verify every visible string renders
- [ ] 5.6 grep the entire `package/hub-dashboard/src/`, `package/worker-dashboard/src/`, and `package/i18n/src/` trees for any `typesafe-i18n`, `i18nObject`, `loadLocale(` (the typesafe-i18n form), or `TranslationFunctions` reference; confirm none remain
- [ ] 5.7 Verify `@rezics/dispatch-i18n`'s `package.json` `exports` exposes `.`, `./messages`, `./runtime`, `./react` with both `types` and `default` paths
- [ ] 5.8 Verify the `@rezics/dispatch-i18n` directory layout matches `@rezics/i18n`'s layout (modulo react helper differences): `messages/<locale>.json`, `project.inlang/`, `src/paraglide/` (gitignored if appropriate), `src/index.ts`, `src/react.ts`
