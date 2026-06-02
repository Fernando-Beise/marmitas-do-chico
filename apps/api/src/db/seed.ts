import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const senhaHash = await bcrypt.hash('senha123', 10)

  // Criando o Chico
  await prisma.admin.upsert({
    where: { email: 'vendedor@gmail.com' },
    update: {},
    create: {
      nome: 'vendedor nome',
      email: 'vendedor@gmail.com',
      senha: senhaHash
    }
  })

  

}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })