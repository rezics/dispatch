## Why

The hub-dashboard currently uses hand-rolled CSS and a small set of bespoke components in `@rezics/dispatch-ui`. The result looks rough and building more primitives by hand is wasted effort — there is no reason to ship a private button, dialog, or dropdown implementation when shadcn/ui + Tailwind solves the exact same problem with vetted Radix primitives and full source ownership. Adopting Tailwind now also removes friction for every future UI change across the workspace.

## What Changes

- Introduce **Tailwind v4** (CSS-first config, `@tailwindcss/vite`) as the workspace-wide styling system; no more hand-written component stylesheets.
- Introduce **shadcn/ui** primitives (Button, Card, Dialog, DropdownMenu, Tabs, Table, Input, etc.) into `@rezics/dispatch-ui` under `src/shadcn/`, installed via the shadcn CLI.
- Keep `@rezics/dispatch-ui` as a **source-exported workspace package** (no build step). Each package exposes `@/*` → `./src/*` via its own `tsconfig.json`, resolved per-file by Vite's `tsconfigPaths` option so aliases never collide across packages.
- Define a single theme token file at `package/ui/src/tailwind.css` (Tailwind base + `@theme` tokens + shadcn CSS variables for light/dark) that every app imports via `@rezics/dispatch-ui/tailwind.css`.
- **BREAKING (internal)**: rewrite existing `@rezics/dispatch-ui` components (`TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart`) to use shadcn primitives and Tailwind classes internally. Public prop APIs remain unchanged; `theme.css` is retired.
- **BREAKING (internal)**: switch dark-mode mechanism from `document.documentElement.dataset.theme` to shadcn's `class="dark"` convention on `<html>`. `localStorage` key preserved.
- Rewrite `hub-dashboard` pages (Overview, Workers, Tasks, Plugins) and `Navigation` to use shadcn primitives. No new user-facing features — visual overhaul only.

## Capabilities

### New Capabilities
- `design-system`: Workspace-wide Tailwind + shadcn foundation — tooling setup, theme tokens, shadcn component placement convention in `@rezics/dispatch-ui`, and how consuming packages import styles and components without alias collisions.

### Modified Capabilities
- `ui-components`: Components continue to export the same names and props, but the theme-awareness requirement changes from CSS custom properties on `data-theme` to Tailwind classes triggered by the `.dark` class on the document root. `theme.css` is removed.
- `hub-dashboard`: Dark-mode toggle implementation switches to shadcn convention (`class="dark"` on `<html>`, `localStorage` key unchanged). All pages adopt shadcn primitives visually; page-level requirements (what each page shows) are unchanged.

## Impact

- **Packages**: `@rezics/dispatch-ui` gains Tailwind v4, shadcn primitives, Radix dependencies, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`. `hub-dashboard` gains `@tailwindcss/vite` plugin and a `tailwind.css` entry.
- **Tooling**: Every app's `vite.config.ts` adds `resolve.tsconfigPaths: true` (or `vite-tsconfig-paths` plugin) and the `@tailwindcss/vite` plugin. Each package's `tsconfig.json` declares `"paths": { "@/*": ["./src/*"] }`.
- **Removed**: `package/ui/src/theme.css`, `package/hub-dashboard/src/components/ThemeProvider.tsx` data-theme attribute logic, any hand-written component CSS in `@rezics/dispatch-ui`.
- **No server-side impact**: Hub API, worker, CLI, and database layers are untouched.
- **No user-visible behavior change** beyond appearance — routes, data flows, and permissions stay the same.
