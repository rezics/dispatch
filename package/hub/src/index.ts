import { Elysia } from 'elysia'
import { openapi } from '@elysiajs/openapi'
import { cors } from '@elysiajs/cors'
import { serverTiming } from '@elysiajs/server-timing'
import { env } from './env'
import { db } from './db'
import { models } from './model'
import { tasksRoutes } from './api/tasks'
import { claimRoutes } from './api/claim'
import { workersRoutes } from './api/workers'
import { projectsRoutes } from './api/projects'
import { auditRoutes } from './api/audit'
import { startReaper } from './reaper/reaper'
import type { AuthProvider } from './auth/jwt'
import { WsManager } from './ws/manager'
import { wsRoute } from './ws/route'
import { ResultPluginRunner } from './plugin/runner'

const authProviders: AuthProvider[] = []
const wsManager = new WsManager(db)
const resultPluginRunner = new ResultPluginRunner(db)

// Add auth providers from environment if configured
// For now, providers are empty — workers can't authenticate until IdP is configured

const app = new Elysia()
  .use(
    openapi({
      documentation: {
        info: {
          title: 'Dispatch Hub API',
          version: '0.1.0',
          description: 'Task dispatch and queue management hub',
        },
        components: {
          securitySchemes: {
            Bearer: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        tags: [
          { name: 'Tasks', description: 'Task management and queue operations' },
          { name: 'Workers', description: 'Worker registration and management' },
          { name: 'Projects', description: 'Project configuration and stats' },
        ],
      },
    }),
  )
  .use(cors({ origin: env.NODE_ENV === 'development' ? true : undefined }))
  .use(serverTiming({ enabled: env.NODE_ENV === 'development' }))
  .use(models)
  .use(tasksRoutes(db, wsManager))
  .use(claimRoutes(db, authProviders, resultPluginRunner))
  .use(workersRoutes(db))
  .use(projectsRoutes(db))
  .use(auditRoutes(db))
  .use(wsRoute(db, authProviders, wsManager))
  .listen(env.PORT)

// Start the reaper loop
const stopReaper = startReaper(db, env.REAPER_INTERVAL)

console.log(`Dispatch Hub running on http://localhost:${env.PORT}`)
console.log(`OpenAPI docs at http://localhost:${env.PORT}/openapi`)

process.on('SIGINT', () => {
  stopReaper()
  process.exit(0)
})

export { app, wsManager }
