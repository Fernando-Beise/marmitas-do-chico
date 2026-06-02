import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function contatosRoutes(app: FastifyInstance) {
  // Listar todos os clientes para a tela do WhatsApp
  app.get('/', async (request, reply) => {
    const clientes = await prisma.cliente.findMany({
      orderBy: { nome: 'asc' }
    })
    return clientes
  })

  // Criar novo cliente manualmente pela tela de contatos
  app.post('/', async (request, reply) => {
    const { nome, telefone } = request.body as { nome: string, telefone: string }
    
    // Cria o cliente (usamos um email falso garantido caso o seu schema exija email único)
    const novoCliente = await prisma.cliente.create({
      data: { 
        nome, 
        telefone, 
        recebeNotificacoes: true 
      }
    })
    return novoCliente
  })

  // Atualizar status (Ativo/Inativo na lista de transmissão)
  app.patch('/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { ativo } = request.body as { ativo: boolean }
    
    const clienteAtualizado = await prisma.cliente.update({
      where: { id },
      data: { recebeNotificacoes: ativo }
    })
    return clienteAtualizado
  })
}