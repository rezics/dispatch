import { prisma as db } from './client'

const ROOT_USER_ID = process.argv[2] ?? process.env.DISPATCH_ROOT_USER_ID ?? 'rezics-root-001'

async function main() {
  const user = await db.user.upsert({
    where: { id: ROOT_USER_ID },
    update: {},
    create: {
      id: ROOT_USER_ID,
      isRoot: true,
      createdBy: null,
    },
  })

  console.log(`Root user ready: ${user.id} (isRoot: ${user.isRoot})`)
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
