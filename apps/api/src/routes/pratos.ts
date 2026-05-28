import { FastifyInstance } from 'fastify'
import { prisma } from '../db/client'
import { Prisma } from '@prisma/client'

export async function pratosRoutes(app: FastifyInstance) {
  
  //LISTAR TODOS OS PRATOS (Abertoe)
  app.get('/', async (request, reply) => {
    // Pega o aviso do Front-end
    const { admin } = request.query as any

    try {
      const pratos = await prisma.prato.findMany({
        // Se for admin, não usa filtro (undefined). Se não for, filtra apenas os disponíveis.
        where: admin === 'true' ? undefined : { disponivel: true }
      })
      
      return pratos
    } catch (error) {
      return reply.status(500).send({ error: 'Erro ao buscar pratos' })
    }
  })

  // CRIAR UM NOVO PRATO (Protegido)
  app.post('/', async (request, reply) => {
    // Validação do Token JWT
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ message: 'Token inválido ou ausente. Não autorizado.' })
    }

    // Processamento da criação
    try {
      const { nome, descricao, preco, fotoUrl } = request.body as any

      if (!nome || !preco) {
        return reply.status(400).send({ message: 'Nome e preço são obrigatórios.' })
      }

      const novoPrato = await prisma.prato.create({
        data: {
          nome,
          descricao,
          preco: new Prisma.Decimal(preco),
          fotoUrl,
          disponivel: true
        }
      })

      return reply.status(201).send(novoPrato)
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ message: 'Erro interno ao cadastrar a marmita.' })
    }
  })

  // ATUALIZAR UM PRATO / ALTERAR DISPONIBILIDADE (Protegido)
  app.put('/:id', async (request, reply) => {
    // Validação do Token JWT
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ message: 'Token inválido ou ausente. Não autorizado.' })
    }

    // Processamento da atualização
    try {
      const { id } = request.params as { id: string }
      const { nome, descricao, preco, fotoUrl, disponivel } = request.body as any

      const pratoAtualizado = await prisma.prato.update({
        where: { id },
        data: { 
          nome, 
          descricao, 
          preco: preco ? new Prisma.Decimal(preco) : undefined,
          fotoUrl, 
          disponivel 
        }
      })

      return pratoAtualizado
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ message: 'Erro ao atualizar a marmita ou registro não encontrado.' })
    }
  })

  // DELETAR UM PRATO (Protegido)
  app.delete('/:id', async (request, reply) => {
    // Validação do Token JWT
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ message: 'Token inválido ou ausente. Não autorizado.' })
    }

    // Processamento da exclusão
    try {
      const { id } = request.params as { id: string }

      await prisma.prato.delete({
        where: { id }
      })

      return reply.status(204).send()
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ message: 'Erro ao excluir a marmita ou registro não encontrado.' })
    }
  })
}