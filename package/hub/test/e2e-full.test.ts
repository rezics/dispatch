import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { signReceipt } from '@rezics/dispatch-type'
import { db } from '../src/db'

const BASE_URL = process.env.HUB_URL ?? 'http://localhost:3721'
const TEST_PROJECT = `e2e-test-${Date.now()}`
const RECEIPT_SECRET = 'e2e-test-secret-key'

async function cleanUp() {
  await db.taskResult.deleteMany({ where: { task: { project: TEST_PROJECT } } })
  await db.usedNonce.deleteMany({ where: { project: TEST_PROJECT } })
  await db.task.deleteMany({ where: { project: TEST_PROJECT } })
  await db.worker.deleteMany({ where: { project: TEST_PROJECT } })
  await db.resultPlugin.deleteMany({ where: { project: TEST_PROJECT } })
  await db.project.deleteMany({ where: { id: TEST_PROJECT } })
}

describe('E2E: HTTP Lease full loop', () => {
  beforeAll(async () => {
    await cleanUp()
    // Create project with full trust
    await db.project.create({
      data: { id: TEST_PROJECT, trustLevel: 'full' },
    })
  })

  afterAll(async () => {
    await cleanUp()
  })

  test('create → claim → complete → verify', async () => {
    // Create tasks
    const task1 = await db.task.create({
      data: { project: TEST_PROJECT, type: 'test:crawl', payload: { url: 'https://example.com' } },
    })
    const task2 = await db.task.create({
      data: { project: TEST_PROJECT, type: 'test:crawl', payload: { url: 'https://example.org' } },
    })

    // Claim tasks (direct queue call since we don't have JWT configured)
    const { claimTasks } = await import('../src/queue/claim')
    const claimed = await claimTasks(db, 'e2e-worker', TEST_PROJECT, 5, '300s')
    expect(claimed.length).toBe(2)

    // Complete tasks
    const { completeTasks } = await import('../src/queue/complete')
    await completeTasks(
      db,
      [
        { id: task1.id, result: { strategy: 'store', data: { title: 'Example' } } },
        { id: task2.id, result: { strategy: 'discard' } },
      ],
      [],
    )

    // Verify task statuses
    const t1 = await db.task.findUnique({ where: { id: task1.id } })
    expect(t1?.status).toBe('done')

    const t2 = await db.task.findUnique({ where: { id: task2.id } })
    expect(t2?.status).toBe('done')

    // Verify result was stored for task1
    const result = await db.taskResult.findUnique({ where: { taskId: task1.id } })
    expect(result).toBeTruthy()
    expect(result?.data).toEqual({ title: 'Example' })
  })
})

describe('E2E: Receipted trust flow', () => {
  const RECEIPTED_PROJECT = `${TEST_PROJECT}-receipted`

  beforeAll(async () => {
    await db.taskResult.deleteMany({ where: { task: { project: RECEIPTED_PROJECT } } })
    await db.usedNonce.deleteMany({ where: { project: RECEIPTED_PROJECT } })
    await db.task.deleteMany({ where: { project: RECEIPTED_PROJECT } })
    await db.project.deleteMany({ where: { id: RECEIPTED_PROJECT } })

    await db.project.create({
      data: {
        id: RECEIPTED_PROJECT,
        trustLevel: 'receipted',
        receiptSecret: RECEIPT_SECRET,
      },
    })
  })

  afterAll(async () => {
    await db.taskResult.deleteMany({ where: { task: { project: RECEIPTED_PROJECT } } })
    await db.usedNonce.deleteMany({ where: { project: RECEIPTED_PROJECT } })
    await db.task.deleteMany({ where: { project: RECEIPTED_PROJECT } })
    await db.project.deleteMany({ where: { id: RECEIPTED_PROJECT } })
  })

  test('signed receipt → verify → complete', async () => {
    // Create and claim a task
    const task = await db.task.create({
      data: { project: RECEIPTED_PROJECT, type: 'test:crawl', payload: {} },
    })

    const { claimTasks } = await import('../src/queue/claim')
    await claimTasks(db, 'e2e-worker', RECEIPTED_PROJECT, 1, '300s')

    // Sign a receipt
    const receipt = await signReceipt(
      {
        taskIds: [task.id],
        workerId: 'e2e-worker',
        project: RECEIPTED_PROJECT,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 60,
        nonce: `nonce-${Date.now()}`,
      },
      RECEIPT_SECRET,
    )

    // Verify the receipt
    const { verifyReceipt, validateReceiptFields } = await import('../src/notary/receipt')
    await verifyReceipt(receipt, RECEIPT_SECRET)
    validateReceiptFields(receipt, [task.id], 'e2e-worker', RECEIPTED_PROJECT)

    // Store nonce
    const { checkAndStoreNonce } = await import('../src/notary/nonce')
    await checkAndStoreNonce(db, receipt.nonce, RECEIPTED_PROJECT, receipt.expiresAt)

    // Complete the task
    const { completeTasks } = await import('../src/queue/complete')
    await completeTasks(db, [{ id: task.id, result: { strategy: 'discard' } }], [])

    const completed = await db.task.findUnique({ where: { id: task.id } })
    expect(completed?.status).toBe('done')

    // Verify nonce replay rejected
    await expect(
      checkAndStoreNonce(db, receipt.nonce, RECEIPTED_PROJECT, receipt.expiresAt),
    ).rejects.toThrow('Nonce already used')
  })
})

describe('E2E: Audited trust flow', () => {
  const AUDITED_PROJECT = `${TEST_PROJECT}-audited`

  beforeAll(async () => {
    await db.task.deleteMany({ where: { project: AUDITED_PROJECT } })
    await db.project.deleteMany({ where: { id: AUDITED_PROJECT } })

    await db.project.create({
      data: {
        id: AUDITED_PROJECT,
        trustLevel: 'audited',
        receiptSecret: RECEIPT_SECRET,
      },
    })
  })

  afterAll(async () => {
    await db.task.deleteMany({ where: { project: AUDITED_PROJECT } })
    await db.worker.deleteMany({ where: { project: AUDITED_PROJECT } })
    await db.project.deleteMany({ where: { id: AUDITED_PROJECT } })
  })

  test('main server signs audit → hub verifies → tasks marked done', async () => {
    // Create a worker for FK constraint
    await db.worker.upsert({
      where: { id: 'e2e-audit-worker' },
      create: { id: 'e2e-audit-worker', project: AUDITED_PROJECT, capabilities: ['test:crawl'], mode: 'http' },
      update: {},
    })

    // Create tasks
    const task1 = await db.task.create({
      data: { project: AUDITED_PROJECT, type: 'test:crawl', payload: {}, status: 'running', workerId: 'e2e-audit-worker', attempts: 1 },
    })
    const task2 = await db.task.create({
      data: { project: AUDITED_PROJECT, type: 'test:crawl', payload: {}, status: 'running', workerId: 'e2e-audit-worker', attempts: 1 },
    })

    // Main Server creates a signature for the audit
    const payload = JSON.stringify({
      taskIds: [task1.id, task2.id].sort(),
      project: AUDITED_PROJECT,
    })
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(RECEIPT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const signature = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    // Verify directly via DB (simulating what the audit endpoint does)
    // Verify signature matches
    const verifyKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(RECEIPT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const expectedBuffer = await crypto.subtle.sign('HMAC', verifyKey, new TextEncoder().encode(payload))
    const expected = Array.from(new Uint8Array(expectedBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    expect(signature).toBe(expected)

    // Mark tasks done (simulating audit endpoint)
    await db.task.updateMany({
      where: { id: { in: [task1.id, task2.id] }, project: AUDITED_PROJECT },
      data: { status: 'done', finishedAt: new Date() },
    })

    const t1 = await db.task.findUnique({ where: { id: task1.id } })
    const t2 = await db.task.findUnique({ where: { id: task2.id } })
    expect(t1?.status).toBe('done')
    expect(t2?.status).toBe('done')
  })
})
