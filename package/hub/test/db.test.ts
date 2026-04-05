import { describe, expect, test, beforeAll, afterAll } from 'bun:test'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#/prisma/client'

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/dispatch'
const adapter = new PrismaPg({ connectionString })
const db = new PrismaClient({ adapter })

beforeAll(async () => {
  await db.$connect()
  await db.taskResult.deleteMany()
  await db.task.deleteMany()
  await db.worker.deleteMany()
  await db.usedNonce.deleteMany()
  await db.resultPlugin.deleteMany()
  await db.project.deleteMany()
})

afterAll(async () => {
  await db.taskResult.deleteMany()
  await db.task.deleteMany()
  await db.worker.deleteMany()
  await db.usedNonce.deleteMany()
  await db.resultPlugin.deleteMany()
  await db.project.deleteMany()
  await db.$disconnect()
})

describe('database', () => {
  test('task creation with defaults', async () => {
    await db.project.create({ data: { id: 'test-project' } })

    const task = await db.task.create({
      data: {
        project: 'test-project',
        type: 'book:crawl',
        payload: { url: 'https://example.com' },
      },
    })

    expect(task.status).toBe('pending')
    expect(task.priority).toBe(5)
    expect(task.attempts).toBe(0)
    expect(task.maxAttempts).toBe(3)
    expect(task.id).toBeTruthy()
  })

  test('nonce uniqueness constraint', async () => {
    await db.usedNonce.create({
      data: {
        nonce: 'unique-nonce-1',
        project: 'test-project',
        expiresAt: new Date(Date.now() + 60000),
      },
    })

    let threw = false
    try {
      await db.usedNonce.create({
        data: {
          nonce: 'unique-nonce-1',
          project: 'test-project',
          expiresAt: new Date(Date.now() + 60000),
        },
      })
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
  })
})
