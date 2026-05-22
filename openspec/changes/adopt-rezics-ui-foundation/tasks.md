## 1. Foundation — dispatch-ui slim-down

- [ ] 1.1 In `package/ui/package.json`, add `@rezics/ui` to `dependencies` (pin to a published version, recommend `^x.y.z`)
- [ ] 1.2 Remove `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css` from `package/ui/package.json`
- [ ] 1.3 Delete `package/ui/src/shadcn/` (all 17 files plus `index.ts`)
- [ ] 1.4 Delete `package/ui/src/tailwind.css`
- [ ] 1.5 Delete `package/ui/src/lib/utils.ts`; replace with a single-line re-export `export { cn } from '@rezics/ui'` (or remove the file entirely and update consumers to import from `@rezics/ui`)
- [ ] 1.6 Update `package/ui/package.json` `exports`: remove `./shadcn` and `./tailwind.css` entries; keep `.` and `./*`
- [ ] 1.7 If `package/ui/components.json` exists (shadcn CLI config), delete it
- [ ] 1.8 Run `bun install` at repo root; verify no stale lockfile references remain to removed packages

## 2. Foundation — hub-dashboard build chain swap

- [ ] 2.1 In `package/hub-dashboard/package.json`, add `unocss` (latest) to `devDependencies`; add `@rezics/ui` to `dependencies`
- [ ] 2.2 In `package/hub-dashboard/package.json`, remove `tailwindcss` and `@tailwindcss/vite`
- [ ] 2.3 Create `package/hub-dashboard/uno.config.ts` that imports and extends `@rezics/ui/uno.config` (add an `@source` covering this app's `src/`)
- [ ] 2.4 In `package/hub-dashboard/vite.config.ts`, remove the `tailwindcss()` plugin import and call; import `UnoCSS` from `unocss/vite` and add `UnoCSS()` to `plugins`
- [ ] 2.5 In `package/hub-dashboard/src/main.css`, replace `@import "@rezics/dispatch-ui/tailwind.css"` with `@import "@rezics/ui/config/base.css"`; remove any `@source`, `@layer base`, and Tailwind-specific directives no longer applicable
- [ ] 2.6 In `package/hub-dashboard/src/main.tsx` (or wherever the import order is set), ensure `import "uno.css"` is added if the UnoCSS plugin requires explicit virtual-module import
- [ ] 2.7 If a dark-mode toggle exists in `hub-dashboard/src/`, update it to set `document.documentElement.dataset.theme = "dark"` (and keep `classList.add("dark")` as transitional alias); reverse for light

## 3. Foundation — worker-dashboard build chain swap

- [ ] 3.1 In `package/worker-dashboard/package.json`, add `unocss` to `devDependencies`; add `@rezics/ui` to `dependencies`; remove `tailwindcss` and `@tailwindcss/vite`
- [ ] 3.2 Create `package/worker-dashboard/uno.config.ts` extending `@rezics/ui/uno.config`
- [ ] 3.3 Update `package/worker-dashboard/vite.config.ts` to swap Tailwind plugin for UnoCSS plugin
- [ ] 3.4 Update `package/worker-dashboard/src/main.css` (or equivalent root CSS) to import `@rezics/ui/config/base.css`
- [ ] 3.5 If a dark-mode toggle exists, apply the `data-theme="dark"` + alias treatment

## 4. Verify foundation boots clean

- [ ] 4.1 Run `bun install` at repo root; verify lockfile resolves without conflicts
- [ ] 4.2 Run dev server for `hub-dashboard` and confirm Vite starts without missing-module errors and the page renders (visuals will look unstyled or partially styled until P5)
- [ ] 4.3 Run dev server for `worker-dashboard` and confirm the same
- [ ] 4.4 Open DevTools, inspect `<html>`, and verify `--colors-*` CSS variables are present on `:root` (not `--color-*`)

## 5. Codemod — hub-dashboard consumer imports

- [ ] 5.1 `package/hub-dashboard/src/pages/Tasks.tsx`: rewrite `import { Button } from '@rezics/dispatch-ui/shadcn/button'` → `import { Button } from '@rezics/ui/shadcn'` (and merge with the other shadcn named imports into one line)
- [ ] 5.2 Same file: rewrite Input, Select.*, Dialog.* imports to a single named-import line from `@rezics/ui/shadcn`
- [ ] 5.3 `package/hub-dashboard/src/pages/Login.tsx`: rewrite Button, Input, Label imports to `@rezics/ui/shadcn`
- [ ] 5.4 `package/hub-dashboard/src/pages/Overview.tsx`: rewrite Button + Select.* imports to `@rezics/ui/shadcn`; keep `import { QueueChart } from '@rezics/dispatch-ui'` untouched
- [ ] 5.5 `package/hub-dashboard/src/pages/Users.tsx`: rewrite Button, Input, Label, Switch imports to `@rezics/ui/shadcn`
- [ ] 5.6 `package/hub-dashboard/src/pages/Projects.tsx`: rewrite Button, Input, Label, Dialog.*, Select.* imports to `@rezics/ui/shadcn`
- [ ] 5.7 `package/hub-dashboard/src/lib/cn.ts`: replace `export { cn } from '@rezics/dispatch-ui/lib/utils'` with `export { cn } from '@rezics/ui'`
- [ ] 5.8 grep the `hub-dashboard/src/` tree for any remaining `@rezics/dispatch-ui/shadcn/` or `@rezics/dispatch-ui/lib/utils` reference; resolve

## 6. Codemod — worker-dashboard consumer imports

- [ ] 6.1 `package/worker-dashboard/src/pages/Tasks.tsx`: verify `import { TaskCard } from '@rezics/dispatch-ui'` is unchanged
- [ ] 6.2 grep the `worker-dashboard/src/` tree for any `@rezics/dispatch-ui/shadcn/` or `@rezics/dispatch-ui/lib/utils` reference; resolve

## 7. Verify codemod — visual + interaction smoke test

- [ ] 7.1 Load `hub-dashboard/Login` page; verify form renders, inputs are focusable, submit button responds, layout matches the rezics token palette
- [ ] 7.2 Load `hub-dashboard/Tasks`; verify table or list renders; open the create-task dialog; verify focus trap, ESC close, click-outside dismiss
- [ ] 7.3 Load `hub-dashboard/Overview`; verify the page renders (QueueChart visuals are re-themed in P8, the chart itself may still draw with old colors here)
- [ ] 7.4 Load `hub-dashboard/Users`; verify form, switch toggling, layout
- [ ] 7.5 Load `hub-dashboard/Projects`; verify form, dialog open/close, select dropdown options render and are selectable
- [ ] 7.6 Load `worker-dashboard/Tasks`; verify TaskCard renders (old palette acceptable here, re-themed in P8)
- [ ] 7.7 If any base-ui vs radix-ui shape difference surfaces (asChild semantics, controlled state shape, Portal target), fix at the consumer site without wrapping base-ui in a radix shim

## 8. Re-theme business components

- [ ] 8.1 `TaskCard` (`package/ui/src/task-card/TaskCard.tsx`): use `bg-surface-elevated` for the card surface, `text-text-primary` for primary text, `text-text-secondary` for meta, `border-whisper` for separators; map status to `info-fill` / `success-fill` / `error-fill` / `warning-fill` / (pending → `border-whisper` + `text-text-secondary`); progress bar fill uses `brand-fill`; ensure import of `Card`, `Badge`, `Progress` from `@rezics/ui/shadcn`
- [ ] 8.2 `WorkerBadge` (`package/ui/src/worker-badge/WorkerBadge.tsx`): mode chip uses `border-whisper`; capability tags use `bg-surface-subtle`; health indicator maps healthy/stale/down to `success-fill` / `warning-fill` / `error-fill`; import `Badge`, `Tooltip` from `@rezics/ui/shadcn`
- [ ] 8.3 `LogPanel` (`package/ui/src/log-panel/LogPanel.tsx`): default row text `text-text-secondary`, timestamps `text-text-tertiary`, error rows `text-error-text` + `border-l border-error-border`, warn rows `text-warning-text`; import `ScrollArea` from `@rezics/ui/shadcn`
- [ ] 8.4 `QueueChart` (`package/ui/src/queue-chart/QueueChart.tsx`): configure recharts `CartesianGrid` and `XAxis`/`YAxis` stroke to `var(--colors-border-whisper)`; `Line` strokes — pending `var(--colors-brand-fill)`, running `var(--colors-warning-fill)`, completed `var(--colors-success-fill)`; empty-state message uses `text-text-tertiary`
- [ ] 8.5 grep `package/ui/src/` for hex literals, raw px values in class strings, and `--rezics-…` or `--color-…` (Tailwind v4 namespace) references; replace with token classes or `var(--colors-…)`

## 9. Final verification

- [ ] 9.1 Run `bun install` and confirm the lockfile is stable
- [ ] 9.2 Dev-server smoke test for both dashboards in light mode: visit every page touched in P7 again, plus any page consuming the re-themed business components
- [ ] 9.3 Repeat the page tour in dark mode (toggle the dark-mode control; verify `document.documentElement.dataset.theme === "dark"` in DevTools and the `.dark` class alias is also set)
- [ ] 9.4 Take light + dark screenshots of: Login, Tasks (hub), Overview (with QueueChart), Users, Projects, Tasks (worker, with TaskCard). Attach to the PR description.
- [ ] 9.5 Verify no `import` from `@rezics/dispatch-ui/shadcn/*` remains anywhere in `package/hub-dashboard/` or `package/worker-dashboard/`
- [ ] 9.6 Verify no `@import "@rezics/dispatch-ui/tailwind.css"` remains in any CSS file
- [ ] 9.7 Verify `@rezics/dispatch-ui` `exports` map contains no `./shadcn` or `./tailwind.css` entries
- [ ] 9.8 Verify TypeScript compilation succeeds for `@rezics/dispatch-ui`, `hub-dashboard`, `worker-dashboard`
