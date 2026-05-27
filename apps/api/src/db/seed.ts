import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const senhaHash = await bcrypt.hash('chico123', 10)

  // 1. Garante que o Chico existe
  await prisma.cliente.upsert({
    where: { email: 'franciscobonfada@gmail.com' },
    update: {},
    create: {
      nome: 'Francisco Hernandez Bonfada',
      telefone: '51997060375',
      email: 'franciscobonfada@gmail.com',
      temConta: true,
      senhaHash: senhaHash
    }
  })

  // 2. Injeta um prato de teste no cardápio
  await prisma.prato.create({
    data: {
      nome: 'Strogonoff Caseiro do Chico',
      descricao: 'Acompanha arroz soltinho, batata palha super crocante e feijão caseiro.',
      preco: 22.90, // Número puro para o nosso front ler
      fotoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600', // Imagem real de comida
      disponivel: true
    }
  })

  console.log('🌱 Dados de teste (Admin + Prato) injetados com sucesso!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })