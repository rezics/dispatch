import type { PrismaClient } from '#/prisma/client'
import type { CompletionReceipt } from '@rezics/dispatch-type'
import { verifyReceipt, validateReceiptFields, ReceiptError } from './receipt'
import { checkAndStoreNonce } from './nonce'

export async function enforceReceipt(
  db: PrismaClient,
  project: { id: string; verification: string; receiptSecret: string | null },
  receipt: CompletionReceipt | undefined,
  taskIds: string[],
  workerId: string,
): Promise<void> {
  if (project.verification === 'none') {
    // No verification needed
    return
  }

  if (project.verification === 'audited') {
    throw new ReceiptError('Audited projects must use POST /tasks/audit', 400)
  }

  if (project.verification === 'receipted') {
    if (!receipt) {
      throw new ReceiptError('Receipt is required for receipted projects', 400)
    }

    if (!project.receiptSecret) {
      throw new ReceiptError('Project has no receipt secret configured', 500)
    }

    // Validate receipt fields match request
    validateReceiptFields(receipt, taskIds, workerId, project.id)

    // Verify HMAC signature
    await verifyReceipt(receipt, project.receiptSecret)

    // Check nonce for anti-replay
    await checkAndStoreNonce(db, receipt.nonce, project.id, receipt.expiresAt)
  }
}
