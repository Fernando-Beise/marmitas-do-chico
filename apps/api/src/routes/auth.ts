import { FastifyInstance } from 'fastify'
import { prisma } from '../db/client'
import bcrypt from 'bcrypt'

export async function authRoutes(app: FastifyInstance) {
  
  // ROTA DE LOGIN (Gera o Token JWT)
  app.post('/login', async (request, reply) => {
    try {
      const { email, senha } = request.body as any

      if (!email || !senha) {
        return reply.status(400).send({ message: 'E-mail e senha são obrigatórios.' })
      }

      // Buscar o usuário pelo e-mail
      const user = await prisma.cliente.findUnique({
        where: { email }
      })

      // Se não achar o usuário ou ele não tiver senha (comprador normal)
      if (!user || !user.senhaHash) {
        return reply.status(401).send({ message: 'E-mail ou senha inválidos.' })
      }

      // Verificar se a senha bate com a criptografia
      const senhaValida = await bcrypt.compare(senha, user.senhaHash)

      if (!senhaValida) {
        return reply.status(401).send({ message: 'E-mail ou senha inválidos.' })
      }

      // Se tudo estiver correto, gera o token JWT assinado
      const token = app.jwt.sign(
        { id: user.id, nome: user.nome },
        { expiresIn: '7d' } // Token vale por 7 dias para maior conforto do admin
      )

      return reply.send({
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email
        },
        token
      })

    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ message: 'Erro interno ao realizar login.' })
    }
  })

  // ROTA DE REGISTRO (Para criar do Chico via Postman)
  app.post('/registrar', async (request, reply) => {
    try {
      const { nome, email, telefone, senha } = request.body as any

      if (!nome || !email || !senha) {
        return reply.status(400).send({ message: 'Nome, e-mail e senha são obrigatórios.' })
      }

      // Verifica se já existe
      const userExists = await prisma.cliente.findUnique({
        where: { email }
      })

      if (userExists) {
        return reply.status(400).send({ message: 'E-mail já cadastrado.' })
      }

      // Criptografa a senha do Chico antes de salvar no banco
      const saltRounds = 10
      const senhaHash = await bcrypt.hash(senha, saltRounds)

      const newUser = await prisma.cliente.create({
        data: {
          nome,
          email,
          telefone: telefone || "00000000000",
          senhaHash // Salva apenas o Hash
        }
      })

      return reply.status(201).send({ 
        message: 'Conta de Administrador criada com sucesso!',
        user: { id: newUser.id, nome: newUser.nome, email: newUser.email }
      })

    } catch (error) {
      app.log.error(error)
      return reply.status(500).send({ message: 'Erro interno ao registrar usuário.' })
    }
  })
}