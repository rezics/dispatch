import { Elysia } from 'elysia'
import { existsSync, readFileSync } from 'fs'
import { join, extname } from 'path'
import type { Worker } from '@rezics/dispatch-worker'
import type { RezicsConfig } from './config'
import { redactSecrets } from './config'

const DASHBOARD_DIR = join(import.meta.dir, '../../worker-dashboard/dist')

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export function createServer(worker: Worker, config: RezicsConfig) {
  const port = config.dashboard.port
  const dashboardExists = existsSync(join(DASHBOARD_DIR, 'index.html'))

  const app = new Elysia()
    .get('/api/status', () => {
      const status = worker.status()
      return {
        ...status,
        hubUrl: config.hub.url,
      }
    })
    .get('/api/tasks', () => {
      const active = worker.activeTasks()
      const status = worker.status()
      return {
        active,
        counts: status.counts,
      }
    })
    .get('/api/config', () => {
      return redactSecrets(config)
    })
    .all('*', ({ request }) => {
      if (!dashboardExists) {
        return new Response(
          JSON.stringify({ error: 'Dashboard not built. API endpoints are available at /api/*.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        )
      }

      const url = new URL(request.url)
      let filePath = join(DASHBOARD_DIR, url.pathname)

      // Try serving the exact file
      if (existsSync(filePath) && !filePath.endsWith('/')) {
        const ext = extname(filePath)
        const mime = MIME_TYPES[ext] || 'application/octet-stream'
        return new Response(readFileSync(filePath), {
          headers: { 'Content-Type': mime },
        })
      }

      // SPA fallback: return index.html for unmatched paths
      const indexPath = join(DASHBOARD_DIR, 'index.html')
      return new Response(readFileSync(indexPath), {
        headers: { 'Content-Type': 'text/html' },
      })
    })

  return {
    start() {
      return app.listen(port)
    },
    stop() {
      return app.stop()
    },
    port,
  }
}
