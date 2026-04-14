import { describe, expect, test, beforeAll, afterAll, beforeEach } from 'bun:test'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#/prisma/client'
import { reap } from '../src/reaper/reaper'
import { agePriorities } from '../src/reaper/aging'

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

  test('max hold exceeded with retries remaining resets to pending', async () => {
    const task = await db.task.create({
      data: {
        project: 'test-project',
        type: 'x',
        payload: {},
        status: 'running',
        workerId: 'w1',
        attempts: 1,
        maxAttempts: 3,
        leaseExpiresAt: new Date(Date.now() + 300000), // lease still valid
        maxHoldExpiresAt: new Date(Date.now() - 60000), // but max hold exceeded
        startedAt: new Date(Date.now() - 120000),
      },
    })

    await reap(db)

    const updated = await db.task.findUniqueOrThrow({ where: { id: task.id } })
    expect(updated.status).toBe('pending')
    expect(updated.workerId).toBeNull()
    expect(updated.maxHoldExpiresAt).toBeNull()
  })

  test('max hold exceeded with no retries left is failed', async () => {
    const task = await db.task.create({
      data: {
        project: 'test-project',
        type: 'x',
        payload: {},
        status: 'running',
        workerId: 'w1',
        attempts: 3,
        maxAttempts: 3,
        leaseExpiresAt: new Date(Date.now() + 300000), // lease still valid
        maxHoldExpiresAt: new Date(Date.now() - 60000), // but max hold exceeded
        startedAt: new Date(Date.now() - 120000),
      },
    })

    await reap(db)

    const updated = await db.task.findUniqueOrThrow({ where: { id: task.id } })
    expect(updated.status).toBe('failed')
    expect(updated.error).toBeTruthy()
  })

  test('null maxHoldExpiresAt is not reclaimed by max hold check', async () => {
    const task = await db.task.create({
      data: {
        project: 'test-project',
        type: 'x',
        payload: {},
        status: 'running',
        workerId: 'w1',
        attempts: 1,
        maxAttempts: 3,
        leaseExpiresAt: new Date(Date.now() + 300000), // lease still valid
        maxHoldExpiresAt: null,
        startedAt: new Date(Date.now() - 120000),
      },
    })

    await reap(db)

    const updated = await db.task.findUniqueOrThrow({ where: { id: task.id } })
    expect(updated.status).toBe('running')
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

describe('aging sweeper', () => {
  test('increases priority for stale pending tasks, respects ceiling, skips null agingRate and running tasks', async () => {
    // Project with aging enabled
    await db.project.update({
      where: { id: 'test-project' },
      data: { agingRate: 10, agingMaxPriority: 100 },
    })

    // Stale pending task: scheduledAt 3 days ago → should gain 30 points
    const staleTask = await db.task.create({
      data: {
        project: 'test-project',
        type: 'x',
        payload: {},
        priority: 5,
        basePriority: 5,
        status: 'pending',
        scheduledAt: new Date(Date.now() - 3 * 86400 * 1000),
      },
    })

    // Running task should NOT be aged
    const runningTask = await db.task.create({
      data: {
        project: 'test-project',
        type: 'x',
        payload: {},
        priority: 5,
        basePriority: 5,
        status: 'running',
        workerId: 'w1',
        scheduledAt: new Date(Date.now() - 3 * 86400 * 1000),
        startedAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + 300000),
      },
    })

    // Create a second project with no aging
    await db.project.create({ data: { id: 'no-aging-project' } })
    await db.worker.create({
      data: { id: 'w-no-aging', project: 'no-aging-project', mode: 'http', capabilities: [] },
    })
    const noAgingTask = await db.task.create({
      data: {
        project: 'no-aging-project',
        type: 'x',
        payload: {},
        priority: 5,
        basePriority: 5,
        status: 'pending',
        scheduledAt: new Date(Date.now() - 3 * 86400 * 1000),
      },
    })

    await agePriorities(db)

    const updatedStale = await db.task.findUniqueOrThrow({ where: { id: staleTask.id } })
    expect(updatedStale.priority).toBe(35) // 5 + floor(10 * 3) = 35

    const updatedRunning = await db.task.findUniqueOrThrow({ where: { id: runningTask.id } })
    expect(updatedRunning.priority).toBe(5) // unchanged

    const updatedNoAging = await db.task.findUniqueOrThrow({ where: { id: noAgingTask.id } })
    expect(updatedNoAging.priority).toBe(5) // unchanged

    // Test ceiling: task with high basePriority should cap at agingMaxPriority
    const highPrioTask = await db.task.create({
      data: {
        project: 'test-project',
        type: 'x',
        payload: {},
        priority: 90,
        basePriority: 90,
        status: 'pending',
        scheduledAt: new Date(Date.now() - 3 * 86400 * 1000),
      },
    })

    await agePriorities(db)

    const updatedHigh = await db.task.findUniqueOrThrow({ where: { id: highPrioTask.id } })
    expect(updatedHigh.priority).toBe(100) // capped at agingMaxPriority

    // Cleanup extra project
    await db.task.deleteMany({ where: { project: 'no-aging-project' } })
    await db.worker.deleteMany({ where: { project: 'no-aging-project' } })
    await db.project.delete({ where: { id: 'no-aging-project' } })
  })

  test('no-op when priorities are already current', async () => {
    await db.project.update({
      where: { id: 'test-project' },
      data: { agingRate: 10, agingMaxPriority: 100 },
    })

    // Task scheduled just now — computed priority == basePriority == stored priority
    const freshTask = await db.task.create({
      data: {
        project: 'test-project',
        type: 'x',
        payload: {},
        priority: 5,
        basePriority: 5,
        status: 'pending',
        scheduledAt: new Date(),
      },
    })

    await agePriorities(db)

    const updated = await db.task.findUniqueOrThrow({ where: { id: freshTask.id } })
    expect(updated.priority).toBe(5) // unchanged
  })
})
