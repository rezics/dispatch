import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test'
import { Elysia } from 'elysia'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#/prisma/client'
import { tasksRoutes } from '../src/api/tasks'
import { workersRoutes } from '../src/api/workers'
import { projectsRoutes } from '../src/api/projects'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/dispatch'
const adapter = new PrismaPg({ connectionString })
const db = new PrismaClient({ adapter })

const app = new Elysia()
  .use(tasksRoutes(db))
  .use(workersRoutes(db))
  .use(projectsRoutes(db))

function req(path: string, init?: RequestInit) {
  return app.handle(new Request(`http://localhost${path}`, init))
}

function post(path: string, body: unknown) {
  return req(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeAll(async () => {
  await db.$connect()
})

afterAll(async () => {
  await db.$disconnect()
})

beforeEach(async () => {
  await db.taskResult.deleteMany()
  await db.task.deleteMany()
  await db.worker.deleteMany()
  await db.usedNonce.deleteMany()
  await db.resultPlugin.deleteMany()
  await db.project.deleteMany()
})

describe('e2e: full task lifecycle', () => {
  test('create project → create tasks → verify status transitions', async () => {
    // 1. Create project
    const projRes = await post('/projects', { id: 'e2e-test', trustLevel: 'full' })
    expect(projRes.status).toBe(201)

    // 2. Create tasks
    const t1Res = await post('/tasks', {
      project: 'e2e-test',
      type: 'book:crawl',
      payload: { url: 'https://example.com/1' },
      priority: 8,
    })
    expect(t1Res.status).toBe(201)
    const t1 = await t1Res.json()

    const t2Res = await post('/tasks', {
      project: 'e2e-test',
      type: 'book:crawl',
      payload: { url: 'https://example.com/2' },
      priority: 3,
    })
    expect(t2Res.status).toBe(201)
    const t2 = await t2Res.json()

    // 3. Verify tasks are pending
    const listRes = await req('/tasks?project=e2e-test&status=pending')
    const pending = await listRes.json()
    expect(pending.length).toBe(2)

    // 4. Simulate claim (directly via queue since auth would block HTTP route)
    const { claimTasks } = await import('../src/queue/claim')
    await db.worker.create({
      data: { id: 'e2e-worker', project: 'e2e-test', mode: 'http', capabilities: ['book:crawl'] },
    })
    const claimed = await claimTasks(db, 'e2e-worker', 'e2e-test', 10, '500s')
    expect(claimed.length).toBe(2)
    expect(claimed[0].priority).toBe(8) // higher priority first

    // 5. Complete tasks
    const { completeTasks } = await import('../src/queue/complete')
    await completeTasks(
      db,
      [{ id: t1.id, result: { strategy: 'discard' } }],
      [{ id: t2.id, error: 'network timeout', retryable: true }],
    )

    // 6. Verify status transitions
    const doneTask = await db.task.findUnique({ where: { id: t1.id } })
    expect(doneTask!.status).toBe('done')
    expect(doneTask!.finishedAt).toBeTruthy()

    const retriedTask = await db.task.findUnique({ where: { id: t2.id } })
    expect(retriedTask!.status).toBe('pending')
    expect(retriedTask!.workerId).toBeNull()

    // 7. Check project stats
    const statsRes = await req('/projects/e2e-test/stats')
    const stats = await statsRes.json()
    expect(stats.done).toBe(1)
    expect(stats.pending).toBe(1)
    expect(stats.running).toBe(0)
    expect(stats.failed).toBe(0)
  })
})
