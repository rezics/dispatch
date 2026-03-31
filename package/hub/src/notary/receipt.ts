import type { CompletionReceipt } from '@rezics/dispatch-type'

export async function verifyReceipt(
  receipt: CompletionReceipt,
  secret: string,
): Promise<void> {
  // Validate expiry
  const now = Math.floor(Date.now() / 1000)
  if (receipt.expiresAt <= now) {
    throw new ReceiptError('Receipt has expired', 400)
  }

  // Verify HMAC-SHA256 signature
  const payload = buildSignaturePayload(receipt)
  const key = await importKey(secret)
  const encoder = new TextEncoder()
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const expectedSignature = bufferToHex(signatureBuffer)

  if (receipt.signature !== expectedSignature) {
    throw new ReceiptError('Signature verification failed', 403)
  }
}

export function validateReceiptFields(
  receipt: CompletionReceipt,
  taskIds: string[],
  workerId: string,
  project: string,
): void {
  // Check taskIds match
  const receiptSet = new Set(receipt.taskIds)
  const completionSet = new Set(taskIds)
  if (receiptSet.size !== completionSet.size || ![...receiptSet].every((id) => completionSet.has(id))) {
    throw new ReceiptError('Receipt taskIds do not match completion taskIds', 400)
  }

  if (receipt.workerId !== workerId) {
    throw new ReceiptError('Receipt workerId does not match JWT sub', 400)
  }

  if (receipt.project !== project) {
    throw new ReceiptError('Receipt project does not match JWT project', 400)
  }
}

export async function signReceipt(
  receipt: Omit<CompletionReceipt, 'signature'>,
  secret: string,
): Promise<CompletionReceipt> {
  const payload = buildSignaturePayload(receipt as CompletionReceipt)
  const key = await importKey(secret)
  const encoder = new TextEncoder()
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const signature = bufferToHex(signatureBuffer)

  return { ...receipt, signature }
}

function buildSignaturePayload(receipt: CompletionReceipt | Omit<CompletionReceipt, 'signature'>): string {
  return JSON.stringify({
    taskIds: receipt.taskIds.slice().sort(),
    workerId: receipt.workerId,
    project: receipt.project,
    issuedAt: receipt.issuedAt,
    expiresAt: receipt.expiresAt,
    nonce: receipt.nonce,
  })
}

async function importKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export class ReceiptError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ReceiptError'
    this.status = status
  }
}
