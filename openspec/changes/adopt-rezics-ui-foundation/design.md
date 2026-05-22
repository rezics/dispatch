## Context

dispatch and rezics are sibling repos in the same product family. Until now their UI foundations have evolved independently:

- **dispatch** (`package/ui/`): Tailwind v4 CSS-first config, vendored shadcn primitives on `radix-ui@1.4.3`, a self-defined token set under `--color-*` (Tailwind v4 native variable names), `tw-animate-css`, `.dark` class for dark mode. 17 shadcn components vendored. 21 import sites across 7 consumer files in the two dashboards.
- **rezics** (`../rezics/package/ui/`, soon to publish as `@rezics/ui` on npm): UnoCSS with `preset-wind4` + `transformer-directives` + `presetAttributify` + `presetIcons` + a custom `preset-tailwind4-variants`, shadcn primitives vendored from the `base-luma` registry on `@base-ui/react`, the full rezics token system under `--colors-*`, `data-theme="dark"` as the canonical dark-mode trigger (with `.dark` class as transitional alias), live storybook reference at `bun -F @rezics/ui storybook`.

The two-tier i18n architecture in rezics — `@rezics/i18n` (app-level catalog) and `@rezics/ui/i18n` (ui-internal autonomous catalog) — is the model dispatch already mirrors with `@rezics/dispatch-i18n`. Engine migration of dispatch-i18n to paraglide-js is handled by a separate change.

The `rezics-design` skill at `.agents/skills/rezics-design/SKILL.md` is written entirely against the rezics token namespace, import paths, and Storybook references. Until dispatch adopts `@rezics/ui`, the skill cannot guide UI work in this repo without lying about paths and tokens.

## Goals / Non-Goals

**Goals:**

- Make `@rezics/ui` the single source of truth for design tokens, shadcn primitives, and the CSS engine across both dispatch dashboards.
- Reduce `@rezics/dispatch-ui` to dispatch-specific business components only (`TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart`), with no vendored primitive duplication.
- Make the `rezics-design` skill actionable in dispatch: every token name and import path the skill references must resolve.
- Keep the codemod surface small enough to land in a single PR with thorough manual visual verification.

**Non-Goals:**

- Touching `@rezics/dispatch-i18n` or any `LL.*` / `useLL()` call site. Engine migration is a separate change.
- Adopting `@rezics/contract`. Out of scope here.
- Adding Storybook to dispatch. Visual reference stays in the rezics monorepo.
- Adding CI-level convention checks (R5 `<SafeLink>`, R9 `--colors-*` namespace). Manual review only for this change; enforcement is a follow-up.
- Local workspace linking (`file:../rezics/...`, `bun link`). This change assumes `@rezics/ui` is published to npm before implementation begins.

## Decisions

### 1. UnoCSS over Tailwind v4

**Choice**: Replace `@tailwindcss/vite` with `unocss/vite` in `hub-dashboard` and `worker-dashboard`. Both apps consume the rezics token system via `@rezics/ui/uno.config`, which they extend with a thin local config.

**Why**: rezics already chose UnoCSS for `preset-wind4` (utility surface compatible with Tailwind v4 class names), `transformer-directives` (CSS `@apply`-style directives), `presetAttributify` (attribute-based class authoring), and a custom `preset-tailwind4-variants`. Adopting `@rezics/ui` means adopting its theme emission and preflight, which is UnoCSS-native. Running Tailwind v4 alongside UnoCSS in the same Vite build adds two parallel CSS engines and forces token duplication. Single engine wins on alignment grounds — class surface is largely identical.

**Alternative considered**: Keep Tailwind v4, re-export tokens from `@rezics/ui` into a Tailwind `@theme` block. Rejected: the rezics token preflight emits CSS via UnoCSS's preflight hook with logic (dark-mode `:where(.dark, [data-theme="dark"])` rewrites, computed `color-mix()` values for state layers). Replicating this against Tailwind's `@theme` macro would fork the source of truth and silently drift.

### 2. Accept `@base-ui/react` primitive API differences

**Choice**: Consumer code at the 21 import sites swaps from radix-built shadcn to `@base-ui/react`-built shadcn (vendored by `@rezics/ui` from the base-luma registry). Public component names (`Button`, `Dialog`, `Select`, `Input`, `Label`, `Switch`) remain. Sub-component shapes (e.g., `Dialog.Trigger`, `Select.Item`) may differ.

**Why**: rezics already completed its `migrate-shadcn-to-base-ui-luma` change. Forking dispatch back to radix would defeat the point of unification. base-ui is the future-facing primitive lib (post-radix-ui v2 split); accepting a one-time API delta is cheaper than maintaining two registries.

**Risk surface and mitigation**: per-component visual + interaction regression test. Focus areas: `Dialog` (`asChild` semantics, focus trap, ESC close, click-outside), `Select` (controlled state shape, item rendering), `Dropdown` (portal target). Mitigation lives in P2 of `tasks.md` — each consumer file is verified in browser before P3 re-themes business components.

### 3. Token namespace: `--color-*` → `--colors-*`

**Choice**: Drop the dispatch-emitted `--color-*` CSS variables entirely. Consume only the rezics-emitted `--colors-*` namespace, either through UnoCSS theme classes (`bg-surface-elevated`, `text-text-primary`) or via raw `var(--colors-…)` references in component-local CSS.

**Why**: These are not the same variables — different names, different value semantics, different light/dark switching mechanism. The rezics `--colors-*` namespace is the single source of truth (per the rezics `unify-tokens-single-source` archived change); R9 forbids `--rezics-*`-prefixed legacy references and we adopt the same rule.

**Implication**: any hex literal, `--color-…` reference, or raw px value remaining in dispatch source code is removed during P3 of `tasks.md`. The four business components consume only token-class names or `var(--colors-…)`.

### 4. Dark-mode trigger: `.dark` class → `data-theme="dark"` attribute

**Choice**: dispatch-side dark-mode toggling writes `document.documentElement.dataset.theme = "dark"` (or removes the attribute for light). The `.dark` class on `<html>` is also written for one release as a transitional alias and is removed in a follow-up.

**Why**: `data-theme="dark"` is the rezics canonical form. `@rezics/ui`'s preflight emits dark-mode tokens under `[data-theme="dark"]` selectors; `.dark` class alias works because of an `:is(.dark, [data-theme="dark"])` rule in the preflight, but the canonical attribute is the supported long-term API.

**Alternative considered**: stay on `.dark` class. Rejected — keeps a paper cut every time someone reads the `rezics-design` skill (which names `data-theme="dark"` as canonical) and finds dispatch contradicting it.

### 5. `@rezics/dispatch-ui` survives as a thin shell

**Choice**: keep the package. Remove `src/shadcn/`, `src/tailwind.css`, `src/lib/utils.ts`. Keep the four business components (`TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart`). Add `@rezics/ui` as a normal dependency. Re-export `cn` from `@rezics/ui` via the existing `./lib` alias for backward source compatibility.

**Why**: the four business components encode dispatch domain concepts (queue, worker, task lifecycle, log severity) that have no place in a generic rezics primitive library. They need a home. A thin in-repo package is cleaner than scattering them across `hub-dashboard/src/components/` and `worker-dashboard/src/components/` (which would force one of the dashboards to import from the other or duplicate).

**Alternatives considered**:
- Move all four into the dashboard that uses each. Rejected — `TaskCard` is used by both `worker-dashboard` and (in future) `hub-dashboard`; `WorkerBadge` is hub-side; splitting forces cross-dashboard imports.
- Contribute the four upstream into `@rezics/ui`. Rejected — they are dispatch domain components; `@rezics/ui` is meant to be product-generic.

### 6. Assume `@rezics/ui` is npm-published before implementation begins

**Choice**: this change assumes `@rezics/ui` is available via standard `npm install` at implementation time. Pin a specific version (e.g., `^1.x.y`) in `package.json`. No `file:../rezics/...` and no `bun link` fallback path is built in.

**Why**: user confirmed publish will precede this change. Workspace path linking would couple dispatch's checkout layout to rezics's, complicating CI, and would burn build time on the `@rezics/ui` source compile (the package ships source via the same source-export pattern dispatch-ui uses).

**Implication for P1**: the first task is `bun add @rezics/ui@<latest>` and the rest of the tasks assume the dep resolves.

### 7. Visual identity shift is accepted, not regretted

**Choice**: both dashboards take on the rezics "warm parchment + 輪迴紅" palette. dispatch's prior "bleached operator console" look is retired.

**Why**: family-product visual alignment is the entire point of the change. Treating the appearance change as a bug would defeat the goal.

**Operational consequence**: P3 of `tasks.md` includes a full light-mode + dark-mode screenshot review of every dashboard page. Visual diffs are expected and accepted as long as semantics (status colors, severity hierarchy, focus states) remain coherent.

## Risks / Trade-offs

- **[base-ui primitive API drift breaks a consumer]** A `<Dialog>` or `<Select>` usage relies on a radix-specific prop shape (`asChild`, controlled-state generics) that base-ui doesn't expose identically → **Mitigation**: P2 includes per-page visual + interaction smoke test before P3 starts; fix at the import-site level by adjusting the prop shape rather than wrapping base-ui in a radix-shim.
- **[Two CSS engines in the same Vite build during transition]** A long-lived PR could leave Tailwind and UnoCSS both registered, fighting over the same class names → **Mitigation**: change lands atomically as one PR; tasks remove Tailwind plugins in the same commits that add UnoCSS plugins.
- **[`--colors-*` and `--color-*` collide visually in DevTools]** Mid-migration, developers may see both namespaces and grep the wrong one → **Mitigation**: P1 deletes `tailwind.css` outright; there is no overlap window in source files.
- **[`@rezics/ui` ships source, not a build artifact]** Build times for dashboards grow because Vite compiles all of `@rezics/ui`'s `src/` per change → **Trade-off accepted**: matches the source-export pattern dispatch-ui already used; HMR ergonomics are worth the build-time delta.
- **[Recharts theme override is fragile]** `QueueChart` configures recharts axis/grid/line colors with rezics tokens; recharts theming uses CSS strings directly, not `var()` references, in some props → **Mitigation**: pass `var(--colors-…)` strings into the props that accept CSS strings; for props that demand literal colors, read computed CSS values once at mount.
- **[Dark-mode alias removal is deferred]** The `.dark` class continues to work as an alias for one release → **Trade-off accepted**: avoids a flash-of-wrong-theme during the transition; alias removal is a one-line follow-up.
- **[No `rezics-design` skill convention CI gate]** A regressing PR could re-introduce hex literals or raw `<a href>` → **Trade-off accepted**: manual review for this PR; a convention check (`bun run check:convention` equivalent) is a separate change.

## Migration Plan

Phased rollout within a single change/PR. Each phase is a logical commit boundary; the whole change lands together.

**P1 — Foundation (no consumer code touched yet)**

1. `bun add @rezics/ui@<latest>` in `@rezics/dispatch-ui`, `hub-dashboard`, `worker-dashboard`.
2. Delete `package/ui/src/shadcn/`, `package/ui/src/tailwind.css`, `package/ui/src/lib/utils.ts`.
3. Update `@rezics/dispatch-ui` `package.json` `exports`: drop `./shadcn`, `./tailwind.css`; keep named-component exports.
4. Remove `tailwindcss`, `@tailwindcss/vite`, `tw-animate-css` from `@rezics/dispatch-ui`; remove `tailwindcss`, `@tailwindcss/vite` from both dashboards.
5. Add `unocss` (+ vite plugin) to both dashboards.
6. Each dashboard gets a `uno.config.ts` that imports and extends `@rezics/ui/uno.config`.
7. Each dashboard's `vite.config.ts` swaps the `tailwindcss()` plugin for `UnoCSS()`.
8. Each dashboard's root CSS (`main.css`) replaces `@import "@rezics/dispatch-ui/tailwind.css"` with `@import "@rezics/ui/config/base.css"`.
9. Dark-mode toggle writes `data-theme="dark"` on `<html>` (and continues writing the `.dark` class as alias).

**P2 — Codemod consumer imports**

10. Rewrite the 21 import sites across 7 files:
    - `hub-dashboard/src/pages/Tasks.tsx` (`Button`, `Input`, `Select.*`, `Dialog.*`)
    - `hub-dashboard/src/pages/Login.tsx` (`Button`, `Input`, `Label`)
    - `hub-dashboard/src/pages/Overview.tsx` (`Select.*`, `Button`; `QueueChart` import stays)
    - `hub-dashboard/src/pages/Users.tsx` (`Button`, `Input`, `Label`, `Switch`)
    - `hub-dashboard/src/pages/Projects.tsx` (`Button`, `Input`, `Label`, `Dialog.*`, `Select.*`)
    - `hub-dashboard/src/lib/cn.ts` (re-export `cn` from `@rezics/ui`)
    - `worker-dashboard/src/pages/Tasks.tsx` (`TaskCard` import stays — package name unchanged)
11. Per-page manual interaction smoke test: focus trap on `Dialog`, controlled state on `Select`, click-outside dismiss.

**P3 — Re-theme business components**

12. Re-implement each of `TaskCard`, `WorkerBadge`, `LogPanel`, `QueueChart` against `@rezics/ui/shadcn` primitives + rezics tokens. See `tasks.md` for per-component token mappings.
13. Light-mode + dark-mode screenshot review of every dashboard page.

**Rollback strategy**

The change is atomic and reverting the merge commit restores the prior state. There is no database migration, no API contract change, no persistent state to roll forward — a revert is sufficient. Consumers (workers, CLI, server) are untouched.

## Open Questions

- **`.dark` class alias removal timing**: kept for one release per Decision 4; the follow-up change name and timeline are not yet defined.
- **R5 / R9 CI enforcement**: a `check:convention` script in dispatch (mirroring rezics's) is desirable but not part of this change. Open as a follow-up.
- **`worker-dashboard` parity**: only `worker-dashboard/src/pages/Tasks.tsx` consumes `@rezics/dispatch-ui` today. As `worker-dashboard` grows, decide whether it duplicates `hub-dashboard`'s patterns or shares page-level scaffolding via `@rezics/dispatch-ui`.
- **`@rezics/ui` version pinning policy**: pin exact patch, caret, or workspace floating? Recommendation: caret (`^x.y.z`) since `@rezics/ui` ships source and breakage surfaces immediately in Vite compile; final decision in implementation.
