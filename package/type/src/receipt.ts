export interface CompletionReceipt {
  taskIds: string[]
  workerId: string
  project: string
  issuedAt: number
  expiresAt: number
  nonce: string
  signature: string
}

export async function signReceipt(
  receipt: Omit<CompletionReceipt, 'signature'>,
  secret: string,
): Promise<CompletionReceipt> {
  const payload = buildSignaturePayload(receipt)
  const key = await importKey(secret)
  const encoder = new TextEncoder()
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const signature = bufferToHex(signatureBuffer)

  return { ...receipt, signature }
}

function buildSignaturePayload(receipt: Omit<CompletionReceipt, 'signature'>): string {
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
    ['sign'],
  )
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
