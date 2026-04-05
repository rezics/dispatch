import { prisma as db } from './client'

const ROOT_USER_ID = process.argv[2] ?? process.env.DISPATCH_ROOT_USER_ID ?? 'rezics-root-001'

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

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
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
