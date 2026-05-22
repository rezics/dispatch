## Why

dispatch is a member of the rezics product family but currently maintains its own UI foundation — a private `@rezics/dispatch-ui` workspace package with vendored shadcn primitives, a self-defined `tailwind.css` token set, and a Tailwind v4 build pipeline — divergent from `@rezics/ui` (UnoCSS + base-ui shadcn + the canonical rezics token system). Sharing one foundation across the family is now possible because `@rezics/ui` will be published to npm before this change is implemented, so dispatch can consume it via standard `npm install` instead of copy-paste sync. Aligning also unblocks the in-repo `rezics-design` skill, which is written against the `--colors-*` token namespace and `@rezics/ui` import paths.

## What Changes

- **BREAKING** Replace Tailwind v4 with UnoCSS (preset-wind4) as the styling system in `hub-dashboard` and `worker-dashboard`. Each app gains a local `uno.config.ts` that extends `@rezics/ui/uno.config`. Root CSS imports `@rezics/ui/config/base.css` instead of `@rezics/dispatch-ui/tailwind.css`.
- **BREAKING** Slim `@rezics/dispatch-ui` to a thin shell. Delete the vendored `src/shadcn/` directory (17 components), delete `src/tailwind.css`, delete `src/lib/utils.ts`. Add `@rezics/ui` as a dependency. Keep dispatch-specific business components only: `TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart`.
- **BREAKING** Re-implement and re-theme the four business components against `@rezics/ui/shadcn` primitives and rezics design tokens (`bg-surface-elevated`, `text-text-primary`, `border-whisper`, semantic `success-fill` / `warning-fill` / `error-fill` / `info-fill`, `brand-fill`).
- Codemod 21 import sites across 7 files in `hub-dashboard/` and `worker-dashboard/`: shadcn primitive imports move from `@rezics/dispatch-ui/shadcn/*` to `@rezics/ui/shadcn`; `cn` re-routes from `@rezics/dispatch-ui/lib/utils` to `@rezics/ui`. Named exports from `@rezics/dispatch-ui` (`TaskCard`, `QueueChart`) keep their import paths — the package name is unchanged.
- **BREAKING** Dark-mode trigger moves from the `.dark` class on `<html>` to the `data-theme="dark"` attribute (the rezics canonical form). `.dark` class continues to work as a transitional alias for one release.
- Visual identity shifts from dispatch's existing "bleached operator console" palette to the rezics "warm parchment + 輪迴紅" palette across both dashboards. This is intentional family-product alignment.

## Capabilities

### New Capabilities

_None. This change re-grounds two existing capabilities on a different foundation; it does not introduce a new one._

### Modified Capabilities

- `design-system`: replace Tailwind-v4-centric requirements with UnoCSS + `@rezics/ui`-centric requirements; require `@rezics/ui` as the single source of truth for tokens and primitives; ban dispatch-side vendored shadcn copies; change dark-mode trigger from `.dark` class to `data-theme="dark"` attribute.
- `ui-components`: re-anchor the four business components (`TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart`) on `@rezics/ui/shadcn` primitives and rezics design tokens (`--colors-*` namespace, semantic fill tokens). Component prop APIs and i18n string props are unchanged.

## Impact

- **Affected packages**: `@rezics/dispatch-ui` (slimmed), `@rezics/dispatch-hub-dashboard` (build chain swap), `@rezics/dispatch-worker-dashboard` (build chain swap).
- **Affected source files**: 7 consumer files across the two dashboards (21 import sites); the four business components in `package/ui/src/{task-card,worker-badge,log-panel,queue-chart}/`.
- **New dependencies**: `@rezics/ui` (npm); `unocss` + its vite plugin in each dashboard.
- **Removed dependencies**: `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css`, vendored radix-ui usage in `@rezics/dispatch-ui` (replaced by `@base-ui/react` through `@rezics/ui`).
- **Visual regression**: all dashboard pages change appearance. Manual smoke-testing of Login / Tasks / Overview / Users / Projects in both light and dark modes is required.
- **No data, API, or contract changes**. No database migration. No HTTP route changes.

## Out of Scope

- **i18n is not touched.** `@rezics/dispatch-i18n` and `typesafe-i18n` remain unchanged in both runtime and call surface. The rezics two-tier i18n architecture is preserved: dispatch app-level i18n stays in `@rezics/dispatch-i18n`; `@rezics/ui` components carry their own ui-internal i18n catalog that dispatch does not consume directly.
- `@rezics/contract` adoption — separate concern, separate change.
- Convention CI checks (R5 `<SafeLink>`-only, R9 `--colors-*` namespace enforcement) — planned as a follow-up.
- Storybook for dispatch — not added; visual reference continues to come from the rezics monorepo.

## Related Changes

- `migrate-dispatch-i18n-to-paraglide` (independent companion change): migrates `@rezics/dispatch-i18n`'s internal engine from `typesafe-i18n` to `paraglide-js`, aligning the exports shape with `@rezics/i18n` in the rezics monorepo. The two changes do not depend on each other and may be sequenced in either order. The `@rezics/dispatch-i18n` package name survives in both.
