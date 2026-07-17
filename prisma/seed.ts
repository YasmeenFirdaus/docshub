import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Admin@123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@dochub.com' },
    update: {},
    create: {
      email: 'admin@dochub.com',
      name: 'Yasmeen',
      password_hash: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })

  console.log(`Created admin user: ${admin.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })