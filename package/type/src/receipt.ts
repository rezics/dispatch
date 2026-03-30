export interface CompletionReceipt {
  taskIds: string[]
  workerId: string
  project: string
  issuedAt: number
  expiresAt: number
  nonce: string
  signature: string
}
