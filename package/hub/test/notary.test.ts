import { describe, test, expect } from 'bun:test'
import { signReceipt } from '@rezics/dispatch-type'
import { verifyReceipt, validateReceiptFields, ReceiptError } from '../src/notary/receipt'

const SECRET = 'test-secret-key-for-hmac-signing'

async function makeSignedReceipt(overrides: Record<string, unknown> = {}) {
  const base = {
    taskIds: ['t1', 't2'],
    workerId: 'w1',
    project: 'crawl',
    issuedAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 60,
    nonce: 'unique-nonce-123',
    ...overrides,
  }
  return signReceipt(base, SECRET)
}

describe('Receipt verification', () => {
  test('valid receipt accepted', async () => {
    const receipt = await makeSignedReceipt()
    await expect(verifyReceipt(receipt, SECRET)).resolves.toBeUndefined()
  })

  test('bad signature rejected', async () => {
    const receipt = await makeSignedReceipt()
    receipt.signature = 'deadbeef'.repeat(8)

    await expect(verifyReceipt(receipt, SECRET)).rejects.toThrow('Signature verification failed')
  })

  test('expired receipt rejected', async () => {
    const receipt = await makeSignedReceipt({
      expiresAt: Math.floor(Date.now() / 1000) - 10,
    })

    await expect(verifyReceipt(receipt, SECRET)).rejects.toThrow('Receipt has expired')
  })

  test('wrong secret rejected', async () => {
    const receipt = await makeSignedReceipt()

    await expect(verifyReceipt(receipt, 'wrong-secret')).rejects.toThrow('Signature verification failed')
  })
})

describe('Receipt field validation', () => {
  test('matching fields accepted', () => {
    expect(() =>
      validateReceiptFields(
        {
          taskIds: ['t1', 't2'],
          workerId: 'w1',
          project: 'crawl',
          issuedAt: 0,
          expiresAt: 0,
          nonce: '',
          signature: '',
        },
        ['t1', 't2'],
        'w1',
        'crawl',
      ),
    ).not.toThrow()
  })

  test('mismatched taskIds rejected', () => {
    expect(() =>
      validateReceiptFields(
        {
          taskIds: ['t1', 't2'],
          workerId: 'w1',
          project: 'crawl',
          issuedAt: 0,
          expiresAt: 0,
          nonce: '',
          signature: '',
        },
        ['t1', 't3'],
        'w1',
        'crawl',
      ),
    ).toThrow('Receipt taskIds do not match')
  })

  test('mismatched workerId rejected', () => {
    expect(() =>
      validateReceiptFields(
        {
          taskIds: ['t1'],
          workerId: 'w1',
          project: 'crawl',
          issuedAt: 0,
          expiresAt: 0,
          nonce: '',
          signature: '',
        },
        ['t1'],
        'w2',
        'crawl',
      ),
    ).toThrow('Receipt workerId does not match')
  })

  test('mismatched project rejected', () => {
    expect(() =>
      validateReceiptFields(
        {
          taskIds: ['t1'],
          workerId: 'w1',
          project: 'crawl',
          issuedAt: 0,
          expiresAt: 0,
          nonce: '',
          signature: '',
        },
        ['t1'],
        'w1',
        'other-project',
      ),
    ).toThrow('Receipt project does not match')
  })
})

describe('signReceipt', () => {
  test('produces verifiable signature', async () => {
    const receipt = await signReceipt(
      {
        taskIds: ['t1'],
        workerId: 'w1',
        project: 'crawl',
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 60,
        nonce: 'test-nonce',
      },
      SECRET,
    )

    expect(receipt.signature).toBeTruthy()
    expect(typeof receipt.signature).toBe('string')
    await expect(verifyReceipt(receipt, SECRET)).resolves.toBeUndefined()
  })
})
