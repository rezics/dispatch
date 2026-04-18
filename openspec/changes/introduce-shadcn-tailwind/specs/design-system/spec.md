## ADDED Requirements

### Requirement: Tailwind v4 is the workspace styling system
The monorepo SHALL use Tailwind CSS v4 (CSS-first configuration) as the sole styling system for all browser-rendered packages. Hand-written component stylesheets for UI primitives are not permitted.

#### Scenario: New component styled with Tailwind
- **WHEN** a new component is added to `@rezics/dispatch-ui` or any app
- **THEN** it uses Tailwind utility classes (or shadcn primitives built on Tailwind) for styling, not bespoke CSS files

#### Scenario: Theme tokens are centralized
- **WHEN** a consumer wants to reference a design token (color, spacing, radius)
- **THEN** the token is defined in `package/ui/src/tailwind.css` under `@theme`, not duplicated per app

### Requirement: shadcn/ui primitives live in `@rezics/dispatch-ui/src/shadcn/`
The `@rezics/dispatch-ui` package SHALL host all shadcn/ui primitive components under `src/shadcn/`, installed via the shadcn CLI configured at `package/ui/components.json`.

#### Scenario: Add a new primitive
- **WHEN** a developer runs `npx shadcn@latest add dialog` from `package/ui/`
- **THEN** the generated files land in `package/ui/src/shadcn/dialog.tsx` and reference helpers via the `@/` alias configured for that package

#### Scenario: Consumer imports a primitive
- **WHEN** `hub-dashboard` needs a `Button`
- **THEN** it imports from `@rezics/dispatch-ui/shadcn/button` (or via the `@rezics/dispatch-ui/shadcn` barrel)

### Requirement: `@rezics/dispatch-ui` ships source, not a build artifact
The `@rezics/dispatch-ui` package SHALL NOT have a JS/TS build step. Its `package.json` `exports` field SHALL point to `.ts`/`.tsx` source files under `src/`, and consumers SHALL compile the package as part of their own Vite build.

#### Scenario: Dashboard dev server picks up ui edits
- **WHEN** a developer edits `package/ui/src/shadcn/button.tsx` while `hub-dashboard` dev server is running
- **THEN** the change appears in the browser via Vite HMR without any rebuild of `@rezics/dispatch-ui`

#### Scenario: No dist directory is shipped
- **WHEN** inspecting the `@rezics/dispatch-ui` package
- **THEN** there is no `dist/` directory and no build script that produces one

### Requirement: `@/*` path aliases are scoped per package
Every package that uses `@/*` imports SHALL declare `"paths": { "@/*": ["./src/*"] }` in its own `tsconfig.json`. Vite SHALL resolve these aliases per-file against the nearest tsconfig (via `resolve.tsconfigPaths: true` or the `vite-tsconfig-paths` plugin) so aliases in one package never resolve to files in another.

#### Scenario: Alias in ui package
- **WHEN** `package/ui/src/shadcn/button.tsx` imports `@/lib/utils`
- **THEN** the import resolves to `package/ui/src/lib/utils.ts`

#### Scenario: Alias in dashboard
- **WHEN** `package/hub-dashboard/src/App.tsx` imports `@/components/Navigation`
- **THEN** the import resolves to `package/hub-dashboard/src/components/Navigation.tsx`, not anything under `package/ui/`

### Requirement: Single shared Tailwind entry file
`@rezics/dispatch-ui` SHALL expose a `tailwind.css` entry via its `exports` map. This file SHALL contain `@import "tailwindcss"`, `@theme` tokens, shadcn CSS variables for light and dark, and `@source` directives covering `@rezics/dispatch-ui` source. Consuming apps SHALL import this entry from their own root stylesheet and append their own `@source` directives for their `src/` tree.

#### Scenario: Dashboard imports the shared entry
- **WHEN** `hub-dashboard` loads its root CSS
- **THEN** it contains `@import "@rezics/dispatch-ui/tailwind.css";` followed by an `@source` directive covering its own `src/`

#### Scenario: Token change propagates
- **WHEN** a color token is modified in `package/ui/src/tailwind.css`
- **THEN** every app using the shared entry reflects the new value on next build

### Requirement: Dark mode uses the `.dark` class on `<html>`
Dark mode SHALL be enabled by adding the `dark` class to `document.documentElement`, following shadcn/ui convention. Tokens for dark mode SHALL be defined inside `.dark { ... }` blocks in the shared `tailwind.css`.

#### Scenario: Toggle dark mode
- **WHEN** a user toggles dark mode in any app
- **THEN** `document.documentElement.classList.contains('dark')` is `true` and all shadcn primitives render with dark tokens
