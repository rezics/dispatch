import type { PrismaClient } from '#/prisma/client'

export async function checkAndStoreNonce(
  db: PrismaClient,
  nonce: string,
  project: string,
  expiresAt: number,
): Promise<void> {
  // Check if nonce already exists
  const existing = await db.usedNonce.findUnique({
    where: { nonce_project: { nonce, project } },
  })

  if (existing) {
    const err = new Error('Nonce already used') as any
    err.status = 409
    throw err
  }

  // Store the nonce
  await db.usedNonce.create({
    data: {
      nonce,
      project,
      expiresAt: new Date(expiresAt * 1000),
    },
  })
}
