import { prisma as db } from './client'

const ROOT_USER_ID = process.argv[2] ?? process.env.DISPATCH_ROOT_USER_ID ?? 'rezics-root-001'

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

const SEED_REZICS = process.env.DISPATCH_SEED_REZICS === 'true'

async function main() {
  const plaintext = generatePassword()
  const passwordHash = await Bun.password.hash(plaintext)

  const user = await db.user.upsert({
    where: { id: ROOT_USER_ID },
    update: { passwordHash },
    create: {
      id: ROOT_USER_ID,
      isRoot: true,
      passwordHash,
      createdBy: null,
    },
  })

  console.log(`Root user ready: ${user.id} (isRoot: ${user.isRoot})`)
  console.log(`Root password: ${plaintext}`)

  if (SEED_REZICS) {
    const receiptSecret = process.env.DISPATCH_RECEIPT_SECRET
    if (!receiptSecret) {
      console.error('DISPATCH_RECEIPT_SECRET is required when DISPATCH_SEED_REZICS=true')
      process.exit(1)
    }

    const jwksUri = process.env.DISPATCH_PROJECT_JWKS_URI

    const project = await db.project.upsert({
      where: { id: 'rezics' },
      update: { receiptSecret, jwksUri },
      create: {
        id: 'rezics',
        verification: 'audited',
        receiptSecret,
        jwksUri,
      },
    })
    console.log(`Rezics project ready: ${project.id} (verification: ${project.verification})`)
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
