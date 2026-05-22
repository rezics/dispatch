## MODIFIED Requirements

### Requirement: UnoCSS via `@rezics/ui` is the workspace styling system
The monorepo SHALL use UnoCSS (with `preset-wind4` and the rezics-curated preset stack) as the sole styling system for all browser-rendered packages, consumed via the `@rezics/ui/uno.config` export. Tailwind v4 SHALL NOT be installed in this repo. Hand-written component stylesheets for UI primitives are not permitted; tokens are referenced via UnoCSS theme classes or `var(--colors-*)` only.

#### Scenario: New component styled with UnoCSS
- **WHEN** a new component is added to `@rezics/dispatch-ui` or any app
- **THEN** it uses UnoCSS utility classes driven by the rezics token system (or shadcn primitives from `@rezics/ui/shadcn`), not bespoke CSS files

#### Scenario: Theme tokens are centralized at `@rezics/ui`
- **WHEN** a consumer wants to reference a design token (color, spacing, radius, motion)
- **THEN** the token is resolved through `@rezics/ui/uno.config` (UnoCSS theme) or via the `--colors-*` CSS variables emitted by the `@rezics/ui` preflight, never duplicated per app or per dispatch-side stylesheet

#### Scenario: Tailwind plugins are absent
- **WHEN** the dependency graph of `hub-dashboard` or `worker-dashboard` is inspected
- **THEN** there is no `tailwindcss`, `@tailwindcss/vite`, or `tw-animate-css` dependency, and `vite.config.ts` registers `UnoCSS()` instead of `tailwindcss()`

### Requirement: shadcn primitives come from `@rezics/ui/shadcn`
The `@rezics/dispatch-ui` package SHALL NOT vendor its own shadcn primitive components. Consumers SHALL import shadcn primitives from `@rezics/ui/shadcn` (the rezics-curated set vendored from the `base-luma` registry on `@base-ui/react`). Dispatch-side `src/shadcn/` directories are forbidden.

#### Scenario: Consumer imports a primitive
- **WHEN** `hub-dashboard` needs a `Button`, `Dialog`, `Select`, `Input`, `Label`, `Switch`, or any other shadcn primitive
- **THEN** it imports from `@rezics/ui/shadcn` (named imports), not from `@rezics/dispatch-ui/shadcn/*`

#### Scenario: No shadcn vendoring in dispatch-ui
- **WHEN** inspecting `@rezics/dispatch-ui`
- **THEN** there is no `src/shadcn/` directory and no `components.json` for the shadcn CLI; the package contains only dispatch-specific business components (`TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart`) and a `cn` re-export

### Requirement: Shared CSS entry is `@rezics/ui/config/base.css` plus the uno preflight
Consuming apps SHALL import `@rezics/ui/config/base.css` from their root stylesheet. UnoCSS preflight (which emits the `--colors-*` token namespace and the dark-mode rewrites) is the sole source of CSS variables. Apps SHALL NOT define their own `@theme` blocks or `--colors-*` overrides.

#### Scenario: Dashboard imports the shared entry
- **WHEN** `hub-dashboard` loads its root CSS
- **THEN** it contains `@import "@rezics/ui/config/base.css";` and the Vite UnoCSS plugin emits the preflight + utilities at build time

#### Scenario: Token change propagates from `@rezics/ui`
- **WHEN** a color token is modified upstream in `@rezics/ui` and a new version is installed
- **THEN** every dispatch app using the shared entry reflects the new value on next build with no app-side change

#### Scenario: App-local uno.config extends the rezics base
- **WHEN** a dashboard needs to add a content-source path or an app-specific shortcut
- **THEN** it does so in a local `uno.config.ts` that imports and extends `@rezics/ui/uno.config`, not by redefining theme tokens

### Requirement: Dark mode uses `data-theme="dark"` on `<html>`
Dark mode SHALL be enabled by setting `data-theme="dark"` on `document.documentElement`. The `dark` class SHALL also be written for one release as a transitional alias matching the rezics preflight's `:is(.dark, [data-theme="dark"])` rule; a follow-up change SHALL remove the class alias. Tokens for dark mode SHALL be defined by `@rezics/ui`'s preflight, not by dispatch-side stylesheets.

#### Scenario: Toggle dark mode
- **WHEN** a user toggles dark mode in any dispatch dashboard
- **THEN** `document.documentElement.dataset.theme === "dark"` and (transitionally) `document.documentElement.classList.contains("dark")` is also `true`, and all `@rezics/ui/shadcn` primitives render with dark tokens

#### Scenario: Default light mode
- **WHEN** `<html>` has neither `data-theme="dark"` nor the `dark` class
- **THEN** components render with the light-mode token values from the `@rezics/ui` preflight

## ADDED Requirements

### Requirement: `@rezics/ui` is the single source of truth for design tokens and primitives
All dispatch UI work SHALL consume design tokens and shadcn primitives exclusively from `@rezics/ui`. Hardcoded hex colors, raw px values, font-family literals, and `--rezics-*`-prefixed legacy variable references are forbidden in dispatch source files. Tokens SHALL be referenced via UnoCSS theme classes (e.g., `bg-surface-elevated`, `text-text-primary`, `border-whisper`, `brand-fill`) or via raw `var(--colors-*)` for cases requiring CSS-only resolution.

#### Scenario: Component uses a token class
- **WHEN** a new business component sets its background to the elevated surface
- **THEN** it writes `bg-surface-elevated`, not `bg-[#fefefe]` or `bg-card`

#### Scenario: CSS-only resolution uses the `--colors-*` namespace
- **WHEN** a component-local style needs a token value at the CSS level (e.g., for a recharts color prop)
- **THEN** it references `var(--colors-brand-fill)` or another `--colors-*` variable, not `var(--rezics-…)` or a hex literal

#### Scenario: Hardcoded color in a PR is rejected
- **WHEN** a PR introduces a hex literal (`#f4606c`, `#1d1d1f`, etc.), raw px in a Tailwind/Uno class (`text-[14px]`), or a `var(--rezics-…)` reference
- **THEN** the change is rejected at review (a future `check:convention` script will enforce this as a CI gate)

### Requirement: `@rezics/dispatch-ui` is a thin shell of business components
The `@rezics/dispatch-ui` package SHALL contain only dispatch-specific business components — components that encode dispatch domain concepts (queue depth, worker mode, task lifecycle, log severity) and have no generic-product analog in `@rezics/ui`. The package SHALL NOT vendor any primitive that exists in `@rezics/ui/shadcn` or `@rezics/ui/primitive/*`. The package SHALL depend on `@rezics/ui` as a normal npm dependency.

#### Scenario: Dispatch-specific component is added to dispatch-ui
- **WHEN** a new component encodes dispatch domain semantics (e.g., a `LeaseTimer` for visualizing task lease remaining time)
- **THEN** it lives in `@rezics/dispatch-ui` and consumes `@rezics/ui/shadcn` primitives internally

#### Scenario: Generic primitive proposal redirected upstream
- **WHEN** someone proposes adding a generic primitive (e.g., a new `<Tabs>` variant) to `@rezics/dispatch-ui`
- **THEN** the proposal is redirected to `@rezics/ui` upstream; dispatch-ui does not vendor it

#### Scenario: `cn` helper is re-exported
- **WHEN** dispatch code needs `cn` for conditional class composition
- **THEN** it imports from `@rezics/ui` (directly) or via the `@rezics/dispatch-ui` re-export, never from a dispatch-vendored `lib/utils`

### Requirement: dispatch is the consumer of the rezics two-tier i18n architecture
dispatch SHALL preserve the rezics two-tier i18n model: `@rezics/dispatch-i18n` owns the dispatch app-level catalog (paralleling `@rezics/i18n`); `@rezics/ui` carries its own ui-internal catalog accessed via `@rezics/ui/i18n` that dispatch SHALL NOT modify or merge with the app-level catalog. The two catalogs compile independently and are consumed by their respective surfaces.

#### Scenario: App-level translation
- **WHEN** a dispatch page needs to display a domain string (task status, project name label, worker mode)
- **THEN** the string comes from `@rezics/dispatch-i18n`, never from `@rezics/ui/i18n`

#### Scenario: UI-internal translation
- **WHEN** an `@rezics/ui` component renders its own chrome string (e.g., a default `Cancel` label inside a `Dialog`)
- **THEN** the string comes from `@rezics/ui`'s own paraglide bundle; dispatch app code does not pass it in

## REMOVED Requirements

### Requirement: Tailwind v4 is the workspace styling system
**Reason**: replaced by UnoCSS via `@rezics/ui/uno.config` to align with the rezics family product stack and consume the rezics token preflight directly.
**Migration**: see the "UnoCSS via `@rezics/ui` is the workspace styling system" requirement above and `tasks.md` P1 for the swap procedure (remove Tailwind plugins, add UnoCSS plugin, swap CSS entry).

### Requirement: shadcn/ui primitives live in `@rezics/dispatch-ui/src/shadcn/`
**Reason**: replaced by sourcing primitives from `@rezics/ui/shadcn` (`base-ui` on the `base-luma` registry). Dispatch SHALL NOT vendor its own shadcn copies.
**Migration**: delete `package/ui/src/shadcn/` and `package/ui/components.json`; codemod the 21 consumer import sites to `@rezics/ui/shadcn`. See `tasks.md` P1–P2.

### Requirement: Single shared Tailwind entry file
**Reason**: superseded by `@rezics/ui/config/base.css` + the UnoCSS preflight as the shared CSS entry.
**Migration**: replace `@import "@rezics/dispatch-ui/tailwind.css"` with `@import "@rezics/ui/config/base.css"` in each app's root stylesheet. See `tasks.md` P1.
