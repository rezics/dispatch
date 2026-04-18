## Context

The `@rezics/dispatch-ui` package currently ships a handful of bespoke components (`TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart`) with hand-written CSS in `theme.css`. The `hub-dashboard` consumes these plus a custom `ThemeProvider` that toggles `data-theme` on `<html>`. Styling is inconsistent and building additional primitives by hand is not a reasonable use of time.

A sibling project, `../rezics`, already demonstrates a working pattern: a source-exported workspace UI package with shadcn components under `src/shadcn/`, consumed across multiple apps without a build step. That project uses UnoCSS; we will use Tailwind v4 instead, which is what shadcn/ui targets natively.

Key existing constraints:
- Monorepo uses pnpm workspaces; `@rezics/dispatch-ui` is consumed via `workspace:*` and exports `./src/index.ts` directly.
- `hub-dashboard` is React 19 + Vite 6 + React Router 7 + TanStack Query.
- `hub-dashboard` is served from `/_dashboard/` base path and embeds into the hub server.
- The dashboard is single-user (root-only) and simple — not a sprawling admin panel.

## Goals / Non-Goals

**Goals:**
- Replace hand-written CSS in `@rezics/dispatch-ui` with Tailwind v4 utility classes and shadcn/ui primitives.
- Keep `@rezics/dispatch-ui` as a source-exported workspace package — no tsup/tsc build step.
- Guarantee that `@/*` path aliases in one package never leak into another (per-package tsconfig resolution).
- Centralize theme tokens and Tailwind base configuration in `@rezics/dispatch-ui/tailwind.css` so every consuming app imports one file.
- Preserve the public API of existing `@rezics/dispatch-ui` components (TaskCard, WorkerBadge, LogPanel, QueueChart) so the dashboard's page code does not have to change props.
- Keep dark-mode persistence (localStorage key `dispatch-theme`) and system-preference default.

**Non-Goals:**
- Adding new pages, new components, or new features to the dashboard.
- Publishing `@rezics/dispatch-ui` to npm or producing a compiled dist bundle.
- Introducing a component playground (Storybook / Cosmos) — out of scope for this change.
- Migrating the CLI (`@rezics/dispatch-cli`) or any non-browser package to Tailwind; scope is limited to packages that render UI.
- Extracting a shared `tailwind.config` beyond the single CSS entry; v4 is CSS-first so there is no JS config to share.

## Decisions

### Decision 1: Tailwind v4 (CSS-first) over v3

Tailwind v4 uses a single `tailwind.css` entry with `@import "tailwindcss"`, `@theme` blocks for tokens, and `@source` directives to tell the scanner where to find class usage. There is no `tailwind.config.js`. This fits a monorepo well: one CSS file in `@rezics/dispatch-ui` owns the tokens, and each app appends its own `@source` for its `src/` tree.

**Alternatives considered:**
- **Tailwind v3 with a shared JS config**: works, but requires every app to import/extend a JS preset, and v4 is the current standard shadcn itself ships under. No upside to staying on v3.
- **UnoCSS with preset-shadcn** (as in `../rezics`): also valid, but shadcn CLI and the official component source are authored for Tailwind. Using Tailwind removes the friction of keeping a Uno preset in sync with upstream shadcn.

### Decision 2: No build step for `@rezics/dispatch-ui`

The package continues to export TypeScript source directly via its `exports` field. Vite compiles it as part of each consumer's build.

**Rationale:**
- Pattern is already proven in `../rezics/package/ui`.
- No watch-mode dance during development, no stale dist to worry about.
- Type-checking from consumers sees the real source, enabling go-to-definition.

**Alternatives considered:**
- **tsup build step**: adds a watcher, a dist directory, and an extra step to the workflow. Only justified when shipping to npm or when consumers are not TypeScript-aware. Neither applies here.

### Decision 3: Per-package `@/*` aliases, resolved per-file by Vite

Each package declares `"paths": { "@/*": ["./src/*"] }` in its own `tsconfig.json`. Vite's `resolve.tsconfigPaths: true` (native in Vite 6) resolves aliases against the nearest tsconfig to the file being compiled, so `@/lib/utils` inside `package/ui/src/shadcn/button.tsx` resolves to `package/ui/src/lib/utils.ts`, while `@/components/Navigation` inside `package/hub-dashboard/src/App.tsx` resolves to `package/hub-dashboard/src/components/Navigation.tsx`. No conflict.

**Alternatives considered:**
- **Unique alias prefix per package** (`@ui/*`, `@dash/*`): works but clutters imports and differs from what shadcn CLI expects to emit. Per-file tsconfig resolution is the clean answer.
- **Full package-name imports** (`@rezics/dispatch-ui/lib/utils`): verbose inside ui itself, makes shadcn CLI output awkward. Not adopted for intra-package imports.

### Decision 4: shadcn components live at `package/ui/src/shadcn/`

- `components.json` sits at `package/ui/components.json` with:
  - `"aliases.components": "@/shadcn"`
  - `"aliases.utils": "@/lib/utils"`
  - `"aliases.ui": "@/shadcn"`
  - `"aliases.hooks": "@/hooks"`
  - `"aliases.lib": "@/lib"`
  - `"tailwind.css": "src/tailwind.css"`
  - `"tailwind.baseColor": "neutral"`
  - `"style": "new-york"`
  - `"iconLibrary": "lucide"`
- `npx shadcn@latest add <component>` is run from `package/ui/`; files land in `src/shadcn/`.
- Consumers import via the package's exports map — primarily as `@rezics/dispatch-ui/shadcn` (re-exported barrel) or `@rezics/dispatch-ui/shadcn/button` (direct file).

### Decision 5: Existing business components wrap shadcn, API unchanged

`TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart` keep their current props. Internally they replace hand-written JSX and CSS classes with shadcn primitives (`Card`, `Badge`, `Progress`, `ScrollArea`) and Tailwind utilities. The recharts-based `QueueChart` stays on recharts but gets styled via shadcn's `Chart` wrapper if it fits cleanly; otherwise just uses the same Tailwind tokens. The i18n and theme-awareness scenarios from `ui-components` still hold.

### Decision 6: Dark mode via `.dark` class on `<html>`

shadcn's convention. `ThemeProvider` reads `localStorage['dispatch-theme']` (unchanged), falls back to `prefers-color-scheme`, and toggles `document.documentElement.classList` instead of `dataset.theme`. CSS custom properties for dark mode live in `@theme` and `@layer base { .dark { ... } }` inside `tailwind.css`.

### Decision 7: `package/ui/package.json` exports surface

```json
"exports": {
  ".": "./src/index.ts",
  "./*": "./src/*",
  "./shadcn": "./src/shadcn/index.ts",
  "./tailwind.css": "./src/tailwind.css"
}
```

The wildcard allows `@rezics/dispatch-ui/shadcn/button` to resolve to `./src/shadcn/button.tsx` (Vite/TS handle the extension). `./shadcn` is a convenience barrel for the common case of importing several primitives at once.

## Risks / Trade-offs

- **Vite bundles ui source every build** → slightly longer cold builds than consuming pre-built JS. Dashboard is small; negligible in practice.
- **No dist = no type-check isolation for ui** → a broken import in ui surfaces as a consumer error, not a ui-level failure. Acceptable for a single-maintainer workspace; addressable later by adding `tsc --noEmit` to CI.
- **Tailwind v4 is still the newest line** → plugin ecosystem is thinner than v3, and some shadcn components may emit class names that expect v4-specific behavior. Mitigation: shadcn's Tailwind v4 branch is stable and is what the CLI ships today.
- **`class="dark"` switch is a minor behavior change** for any external consumer of `@rezics/dispatch-ui` that read `data-theme`. There are none today (only `hub-dashboard`), so the blast radius is internal.
- **Per-file tsconfig alias resolution depends on `vite-tsconfig-paths`-style behavior** → if a future tool doesn't honor nested tsconfigs (e.g., a bare Node script importing ui source), aliases would fail. Mitigation: keep intra-ui imports short and mostly relative within tight subdirectories where it reads cleanly; rely on `@/` for cross-folder ui-internal references.
- **Existing `theme.css` consumers** → only `hub-dashboard` imports it today. Removal is coordinated in the same change.

## Migration Plan

1. **Land foundations in `@rezics/dispatch-ui`** — Tailwind v4, shadcn CLI scaffolding, first batch of primitives (Button, Card, Badge, Input, Dialog, DropdownMenu, Table, Tabs, ScrollArea, Progress, Separator, Tooltip). `theme.css` left in place temporarily.
2. **Wire `hub-dashboard`** — add Vite tsconfigPaths + Tailwind plugin, import `@rezics/dispatch-ui/tailwind.css`, switch `ThemeProvider` to class-based dark mode.
3. **Rewrite shell** — `App.tsx`, `Navigation.tsx` rebuilt with shadcn primitives. Verify dashboard still mounts and dark mode toggles.
4. **Rewrite pages** — Overview, Workers, Tasks, Plugins, one at a time.
5. **Rewrite business components** — `TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart` internals replaced. Public props unchanged; existing page usage is validated by running the dashboard.
6. **Remove `theme.css`** and any residual hand-written CSS from `@rezics/dispatch-ui`.
7. **Smoke test** — open dashboard in dev, cycle light/dark, click through every nav item, confirm tasks list filter/pagination works, verify queue chart renders.

Rollback: revert the branch. No DB migration, no API shape change, no deployed artifact to undo.

## Open Questions

- Do we want `@rezics/dispatch-ui/shadcn` to be a single barrel re-exporting every primitive, or do we import primitives by file path? Barrel is convenient but bigger for tree-shaking; file-path imports are marginally more verbose. Default to barrel unless bundle size bites.
- Is lucide-react the right icon library, or do we stay off icon fonts entirely? Default to lucide since shadcn assumes it; revisit if bundle hurts.
