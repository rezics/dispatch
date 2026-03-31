import { Elysia } from 'elysia'
import { staticPlugin } from '@elysiajs/static'
import { existsSync } from 'fs'
import { resolve } from 'path'

export function dashboardRoute(disabled: boolean) {
  const app = new Elysia()

  if (disabled) {
    app.get('/_dashboard*', () => new Response('Dashboard disabled', { status: 404 }))
    return app
  }

  const dashboardDir = resolve(import.meta.dir, '../dashboard-dist')

  if (!existsSync(dashboardDir)) {
    app.get('/_dashboard*', () => new Response('Dashboard not built. Run `bun run prebuild` in the hub package.', { status: 404 }))
    return app
  }

  // Serve static files
  app.use(
    staticPlugin({
      assets: dashboardDir,
      prefix: '/_dashboard',
      alwaysStatic: false,
    }),
  )

  // SPA fallback: serve index.html for all /_dashboard sub-routes
  app.get('/_dashboard/*', async () => {
    const indexPath = resolve(dashboardDir, 'index.html')
    const file = Bun.file(indexPath)
    return new Response(file, {
      headers: { 'Content-Type': 'text/html' },
    })
  })

  return app
}
