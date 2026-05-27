import { FastifyInstance } from 'fastify'
import { prisma } from '../db/client'
import { Prisma } from '@prisma/client'

export async function pratosRoutes(app: FastifyInstance) {
  
  // 1. LISTAR TODOS OS PRATOS (Aberto para o cliente ver na Home)
  app.get('/', async (request, reply) => {
    try {
      const pratos = await prisma.prato.findMany({
        where: { disponivel: true }, // Traz apenas pratos ativos para o cliente não comprar o que não tem
        orderBy: { nome: 'asc' }
      })
      return pratos
    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ message: 'Erro ao buscar o cardápio.' })
    }
  })

  // 2. CRIAR UM NOVO PRATO (Protegido - Só o Admin logado pode fazer)
  app.post('/', async (request, reply) => {
    // Validação do Token JWT
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ message: 'Token inválido ou ausente. Não autorizado.' })
    }

    // Processamento da criação se o token for válido
    try {
      const { nome, descricao, preco, fotoUrl } = request.body as any

      if (!nome || !preco) {
        return reply.status(400).send({ message: 'Nome e preço são obrigatórios.' })
      }

      const novoPrato = await prisma.prato.create({
        data: {
          nome,
          descricao,
          preco: new Prisma.Decimal(preco), // CORREÇÃO: Transforma para o tipo Decimal exigido pelo Prisma
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

  // 3. ATUALIZAR UM PRATO / ALTERAR DISPONIBILIDADE (Protegido)
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
          preco: preco ? new Prisma.Decimal(preco) : undefined, // CORREÇÃO: Trata o Decimal opcional se for enviado
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

  // 4. DELETAR UM PRATO (Protegido)
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