import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function adicionaisRoutes(app: FastifyInstance) {
  // 1. Listar apenas os NÃO arquivados
  app.get('/', async (request, reply) => {
    return await prisma.adicional.findMany({
      where: { arquivado: false },
      orderBy: { nome: 'asc' }
    })
  })

  // 2. Criar novo adicional
  app.post('/', async (request, reply) => {
    const { nome, preco } = request.body as { nome: string, preco: number }
    return await prisma.adicional.create({
      data: { nome, preco, disponivel: true, arquivado: false }
    })
  })

  // 3. Editar Adicional
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { nome, preco } = request.body as { nome: string, preco: number }
    return await prisma.adicional.update({
      where: { id },
      data: { nome, preco }
    })
  })

  // 4. Ativar/Desativar status
  app.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { disponivel } = request.body as { disponivel: boolean }
    return await prisma.adicional.update({
      where: { id },
      data: { disponivel }
    })
  })

  // 5. Excluir (Soft Delete + Desvincular de Pratos)
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    
    // A Mágica: Marca como arquivado, e limpa as relações COM PRATOS (set: []) 
    // mas NÃO toca na relação com itensPedido, mantendo o histórico!
    return await prisma.adicional.update({
      where: { id },
      data: { 
        arquivado: true, 
        disponivel: false,
        pratos: { set: [] } 
      }
    })
  })
}