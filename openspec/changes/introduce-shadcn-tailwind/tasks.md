## 1. Foundations in `@rezics/dispatch-ui`

- [ ] 1.1 Add `tsconfig.json` with `"paths": { "@/*": ["./src/*"] }` (or add to existing) in `package/ui/`
- [ ] 1.2 Add runtime deps to `package/ui/package.json`: `tailwindcss@^4`, `@tailwindcss/vite@^4`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`
- [ ] 1.3 Update `package/ui/package.json` `exports` map to include `"./*": "./src/*"`, `"./shadcn": "./src/shadcn/index.ts"`, `"./tailwind.css": "./src/tailwind.css"`; keep `"."` pointing at `./src/index.ts`; drop the old `"./src/theme.css"` entry
- [ ] 1.4 Create `package/ui/src/lib/utils.ts` exporting `cn()` (clsx + tailwind-merge)
- [ ] 1.5 Create `package/ui/src/tailwind.css` with `@import "tailwindcss"`, `@theme` color/radius tokens, `.dark { ... }` overrides, and `@source` directives covering `./src/**/*.{ts,tsx}`
- [ ] 1.6 Create `package/ui/components.json` with style `new-york`, baseColor `neutral`, `iconLibrary: lucide`, aliases (`components: @/shadcn`, `utils: @/lib/utils`, `ui: @/shadcn`, `lib: @/lib`, `hooks: @/hooks`), `tailwind.css: src/tailwind.css`
- [ ] 1.7 Install the first batch of shadcn primitives from `package/ui/` via `npx shadcn@latest add button card badge input label dialog dropdown-menu table tabs scroll-area progress separator tooltip sonner switch select popover`
- [ ] 1.8 Create `package/ui/src/shadcn/index.ts` barrel re-exporting every primitive file in the folder

## 2. Wire `hub-dashboard` to the new foundation

- [ ] 2.1 Add `"paths": { "@/*": ["./src/*"] }` to `package/hub-dashboard/tsconfig.json` (keep existing `#/*` → `../hub/*`)
- [ ] 2.2 Add `@tailwindcss/vite` to `package/hub-dashboard/package.json` devDependencies
- [ ] 2.3 Update `package/hub-dashboard/vite.config.ts` to include the `@tailwindcss/vite` plugin and enable `resolve.tsconfigPaths: true` (or add `vite-tsconfig-paths` plugin if the native option is insufficient)
- [ ] 2.4 Create `package/hub-dashboard/src/main.css` containing `@import "@rezics/dispatch-ui/tailwind.css";` and `@source "./";` for the dashboard's own src tree; import it from `main.tsx`
- [ ] 2.5 Rewrite `package/hub-dashboard/src/components/ThemeProvider.tsx` to toggle `document.documentElement.classList` between `dark` and no-class; keep the `dispatch-theme` localStorage key and system-preference default; add a pre-paint inline script (or the same logic hoisted) to set the class before React mounts so there is no flash of wrong theme
- [ ] 2.6 Remove any imports of `@rezics/dispatch-ui/src/theme.css` from the dashboard

## 3. Rewrite dashboard shell with shadcn primitives

- [ ] 3.1 Rewrite `package/hub-dashboard/src/components/Navigation.tsx` using shadcn primitives and Tailwind; keep existing nav items (Overview, Workers, Tasks, Plugins)
- [ ] 3.2 Update `package/hub-dashboard/src/App.tsx` layout to use Tailwind utilities (no hand-written layout CSS)
- [ ] 3.3 Add a dark-mode toggle to the navigation using a shadcn `Button` + `lucide-react` sun/moon icon; wired to the updated `ThemeProvider`
- [ ] 3.4 Manually smoke-test the shell: dashboard mounts, navigation works, dark toggle flips `.dark` on `<html>` with no FOUC

## 4. Rewrite dashboard pages

- [ ] 4.1 Rewrite Overview page using shadcn `Card` primitives and Tailwind; keep data fetching and refresh behavior unchanged
- [ ] 4.2 Rewrite Workers page using shadcn `Table` primitives and Tailwind
- [ ] 4.3 Rewrite Tasks page using shadcn `Table`, `Select`, `Input`, `Popover`, pagination controls; preserve filter state and query behavior
- [ ] 4.4 Rewrite Task detail (modal or panel) using shadcn `Dialog` or `Sheet`
- [ ] 4.5 Rewrite Plugins page using shadcn `Card`, `Switch`, `Input`; preserve PATCH request behavior

## 5. Rewrite `@rezics/dispatch-ui` business components

- [ ] 5.1 Rewrite `TaskCard` internals to use shadcn `Card`, `Badge`, `Progress` + Tailwind; keep prop API and exported name unchanged
- [ ] 5.2 Rewrite `WorkerBadge` internals to use shadcn `Badge`, `Tooltip` + Tailwind; keep prop API unchanged
- [ ] 5.3 Rewrite `LogPanel` internals to use shadcn `ScrollArea` + Tailwind; keep prop API unchanged
- [ ] 5.4 Update `QueueChart` to consume Tailwind theme tokens (recharts stays); wrap with shadcn `Chart` container if it reads cleanly

## 6. Cleanup

- [ ] 6.1 Delete `package/ui/src/theme.css`
- [ ] 6.2 Delete any residual hand-written component CSS under `package/ui/src/` (per-component `.css` files no longer imported)
- [ ] 6.3 Run `pnpm install` at repo root and confirm no orphaned dependencies remain; remove anything only used by deleted CSS
- [ ] 6.4 Run full dashboard manually in dev: cycle light/dark, click every nav item, filter + paginate tasks, confirm queue chart renders, verify TaskCard / WorkerBadge / LogPanel render inside their consuming pages
- [ ] 6.5 Run `openspec validate introduce-shadcn-tailwind --strict`
