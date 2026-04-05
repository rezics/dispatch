import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#/prisma/client'
import { reap } from '../src/reaper/reaper'

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
    data: { id: 'w1', project: 'test-project', mode: 'http', capabilities: [] },
  })
})

describe('reaper', () => {
  test('expired task with retries remaining is reset to pending', async () => {
    const task = await db.task.create({
      data: {
        project: 'test-project',
        type: 'x',
        payload: {},
        status: 'running',
        workerId: 'w1',
        attempts: 1,
        maxAttempts: 3,
        leaseExpiresAt: new Date(Date.now() - 60000),
        startedAt: new Date(Date.now() - 120000),
      },
    })

    await reap(db)

    const updated = await db.task.findUniqueOrThrow({ where: { id: task.id } })
    expect(updated.status).toBe('pending')
    expect(updated.workerId).toBeNull()
    expect(updated.leaseExpiresAt).toBeNull()
    expect(updated.startedAt).toBeNull()
  })

  test('expired task with no retries left is failed', async () => {
    const task = await db.task.create({
      data: {
        project: 'test-project',
        type: 'x',
        payload: {},
        status: 'running',
        workerId: 'w1',
        attempts: 3,
        maxAttempts: 3,
        leaseExpiresAt: new Date(Date.now() - 60000),
        startedAt: new Date(Date.now() - 120000),
      },
    })

    await reap(db)

    const updated = await db.task.findUniqueOrThrow({ where: { id: task.id } })
    expect(updated.status).toBe('failed')
    expect(updated.error).toBeTruthy()
  })

  test('expired nonces are purged', async () => {
    await db.usedNonce.create({
      data: {
        nonce: 'old-nonce',
        project: 'test-project',
        expiresAt: new Date(Date.now() - 300000),
      },
    })
    await db.usedNonce.create({
      data: {
        nonce: 'fresh-nonce',
        project: 'test-project',
        expiresAt: new Date(Date.now() + 300000),
      },
    })

    await reap(db)

    const remaining = await db.usedNonce.findMany()
    expect(remaining.length).toBe(1)
    expect(remaining[0].nonce).toBe('fresh-nonce')
  })
})
