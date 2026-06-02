import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const senhaHash = await bcrypt.hash('CultClub-2024', 10)

  // Criando o Chico
  await prisma.admin.upsert({
    where: { email: 'franciscobonfada@gmail.com' },
    update: {},
    create: {
      nome: 'Francisco Hernandez Bonfada',
      email: 'franciscobonfada@gmail.com',
      senha: senhaHash
    }
  })

  

}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })