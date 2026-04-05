import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#/prisma/client'
import { claimTasks } from '../src/queue/claim'
import { completeTasks } from '../src/queue/complete'
import { renewLease } from '../src/queue/renew'
import { createTask } from '../src/queue/create'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/dispatch'
const adapter = new PrismaPg({ connectionString })
const db = new PrismaClient({ adapter })

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
  await db.project.create({ data: { id: 'test-project' } })
  await db.worker.create({
    data: { id: 'w1', project: 'test-project', mode: 'http', capabilities: ['book:crawl'] },
  })
  await db.worker.create({
    data: { id: 'w2', project: 'test-project', mode: 'http', capabilities: ['book:crawl'] },
  })
})

describe('queue', () => {
  test('concurrent claim returns disjoint sets', async () => {
    for (let i = 0; i < 10; i++) {
      await createTask(db, { project: 'test-project', type: 'book:crawl', payload: { i } })
    }

    const [batch1, batch2] = await Promise.all([
      claimTasks(db, 'w1', 'test-project', 5, '500s'),
      claimTasks(db, 'w2', 'test-project', 5, '500s'),
    ])

    const ids1 = new Set(batch1.map((t) => t.id))
    const ids2 = new Set(batch2.map((t) => t.id))

    expect(batch1.length + batch2.length).toBe(10)
    for (const id of ids1) {
      expect(ids2.has(id)).toBe(false)
    }
  })

  test('claim respects priority ordering', async () => {
    await createTask(db, { project: 'test-project', type: 'x', payload: {}, priority: 3 })
    await createTask(db, { project: 'test-project', type: 'x', payload: {}, priority: 10 })
    await createTask(db, { project: 'test-project', type: 'x', payload: {}, priority: 7 })

    const claimed = await claimTasks(db, 'w1', 'test-project', 10, '500s')
    expect(claimed[0].priority).toBe(10)
    expect(claimed[1].priority).toBe(7)
    expect(claimed[2].priority).toBe(3)
  })

  test('completion marks done and retry logic', async () => {
    const t1 = await createTask(db, { project: 'test-project', type: 'x', payload: {} })
    const t2 = await createTask(db, {
      project: 'test-project',
      type: 'x',
      payload: {},
      maxAttempts: 3,
    })

    await claimTasks(db, 'w1', 'test-project', 10, '500s')

    await completeTasks(
      db,
      [{ id: t1.id, result: { strategy: 'discard' } }],
      [{ id: t2.id, error: 'timeout', retryable: true }],
    )

    const done = await db.task.findUnique({ where: { id: t1.id } })
    const retried = await db.task.findUnique({ where: { id: t2.id } })

    expect(done!.status).toBe('done')
    expect(retried!.status).toBe('pending')
    expect(retried!.workerId).toBeNull()
  })

  test('lease expiry blocks renewal', async () => {
    const t = await createTask(db, { project: 'test-project', type: 'x', payload: {} })
    await claimTasks(db, 'w1', 'test-project', 1, '1s')

    // Manually expire lease
    await db.task.update({
      where: { id: t.id },
      data: { leaseExpiresAt: new Date(Date.now() - 10000) },
    })

    let threw = false
    try {
      await renewLease(db, [t.id], 'w1', '300s')
    } catch (err) {
      threw = true
      expect((err as Error).message).toBe('LEASE_EXPIRED')
    }
    expect(threw).toBe(true)
  })

  test('excessive lease rejected', () => {
    expect(() => claimTasks(db, 'w1', 'test-project', 1, '7200s')).toThrow(
      'exceeds maximum',
    )
  })
})
