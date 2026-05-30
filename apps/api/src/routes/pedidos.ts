import { FastifyInstance } from 'fastify'
import { prisma } from '../db/client'
import { Prisma } from '@prisma/client'


export async function pedidosRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    try {
      const body = request.body as any
      let idDoUsuario = body.clienteId

      if (!idDoUsuario || idDoUsuario.includes("Ajustado")) {
        
        // Usando findFirst para contornar o cache do VS Code
        let clienteExistente = await prisma.cliente.findUnique({
          where: { email: body.dadosEntrega.email }
        })

        // Se não encontrar, cadastra um novo
        if (!clienteExistente) {
            clienteExistente = await prisma.cliente.create({
                data: {
                    nome: `${body.dadosEntrega.nome || ''} ${body.dadosEntrega.sobrenome || ''}`.trim(),
                    telefone: body.dadosEntrega.telefone,
                    email: body.dadosEntrega.email // Mantém o e-mail, mas sem o risco do banco quebrar
                }
            })
        }
        
        idDoUsuario = clienteExistente.id
      }

      const enderecoCompleto = `${body.dadosEntrega.rua}, ${body.dadosEntrega.numero} - ${body.dadosEntrega.bairro}`
      const novoEndereco = await prisma.endereco.create({
        data: {
          clienteId: idDoUsuario,
          descricao: 'Endereço de Entrega Padrão',
          enderecoCompleto: enderecoCompleto,
          latitude: 0.0,
          longitude: 0.0,
          principal: true
        }
      })

      for (const item of body.itens) {
        const pratoExiste = await prisma.prato.findUnique({ where: { id: item.pratoId } })
        if (!pratoExiste) {
          await prisma.prato.create({
            data: {
              id: item.pratoId,
              nome: "Marmita Selecionada",
              descricao: "Item adicionado via fluxo de testes",
              preco: new Prisma.Decimal(item.precoUnitario),
              disponivel: true
            }
          })
        }
      }

      

      const novoPedido = await prisma.pedido.create({
        data: {
          clienteId: idDoUsuario,
          enderecoId: novoEndereco.id,
          total: new Prisma.Decimal(body.total),
          status: 'pendente',
          itens: {
            create: body.itens.map((item: any) => ({
              pratoId: item.pratoId,
              quantidade: Number(item.quantidade),
              precoUnitario: new Prisma.Decimal(item.precoUnitario)
            }))
          }
        }
      })

      const MERCADO_PAGO_TOKEN = process.env.MP_ACCESS_TOKEN
      let dadosDoPix = { qrCodeCopyPaste: "", qrCodeBase64: "" }
      let transacaoIdMp = "MOCK_" + novoPedido.id

      // INTEGRAÇÃO COM ORDERS
      if (MERCADO_PAGO_TOKEN) {
        const valorFormatadoString = String(Number(body.total).toFixed(2))

        const mpResponse = await fetch('https://api.mercadopago.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
            'X-Idempotency-Key': novoPedido.id
          },
          body: JSON.stringify({
              type: "online",
              external_reference: novoPedido.id,
              total_amount: valorFormatadoString,
              payer: {
                // o Sandbox exige o do TestUser, essa trava:
                // Em produção seria apenas: email: body.dadosEntrega.email
                email: body.dadosEntrega?.email?.includes('@testuser.com') 
                  ? body.dadosEntrega.email 
                  : 'TESTUSER8503116683844982075@testuser.com', 
                
                first_name: "APRO", // Gatilho obrigatório do Sandbox para aprovação automática
                
                // Adicionamos o sobrenome e o documento vindo do formulário
                last_name: body.dadosEntrega?.sobrenome || 'Testador',
                identification: {
                  type: 'CPF',
                  // Limpa pontos e hifens do CPF digitado antes de enviar para a API
                  number: body.dadosEntrega?.cpf?.replace(/\D/g, '') || '12345678909' 
                }
              },
              transactions: {
                payments: [
                  {
                    amount: valorFormatadoString,
                    payment_method: {
                      id: "pix",
                      type: "bank_transfer"
                    }
                  }
                ]
              }
            })
        })

        const orderData = await mpResponse.json()

        if (mpResponse.ok && orderData.transactions?.payments?.[0]) {
          const principalPayment = orderData.transactions.payments[0]
          if (principalPayment.payment_method?.qr_code) {
            dadosDoPix.qrCodeCopyPaste = principalPayment.payment_method.qr_code
            dadosDoPix.qrCodeBase64 = principalPayment.payment_method.qr_code_base64 || ""
            transacaoIdMp = String(principalPayment.id || orderData.id)
            console.log("SUCESSO! O Mercado Pago aprovou e gerou o PIX!");
          }
        } else {
          // Se der erro, o status EXATO (ex: 401) para a tela do Front-end
          console.error("ERRO DO MERCADO PAGO:", orderData)
          return reply.status(mpResponse.status).send({ 
            error: "Recusado pelo Mercado Pago", 
            details: orderData 
          })
        }
      }

      await prisma.pagamento.create({
        data: {
          pedidoId: novoPedido.id,
          metodo: 'PIX',
          status: 'pendente',
          idTransacaoMp: transacaoIdMp
        }
      })

      return reply.status(201).send({
        pedidoId: novoPedido.id,
        pix: dadosDoPix
      })

    } catch (error) {
      console.error("Erro no Back-end:", error)
      return reply.status(500).send({ error: "Erro interno no servidor." })
    }
  })
  app.get('/', async (request, reply) => {
    // Exemplo de como deve estar o Prisma no back-end
    const pedidos = await prisma.pedido.findMany({
      include: {
        cliente: true,
        endereco: true,
        pagamento: true,
        itens: {
          include: {
            prato: true
          }
        }
      },
      orderBy: {
        criadoEm: 'desc'
      }
    })
    return pedidos
  })
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: true,
        endereco: true, 
        pagamento: true, 
        itens: { include: { prato: true } }
      }
    })
    return pedido
  })
  app.patch('/:id/status', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { status } = request.body as { status: string }
      
      const pedidoAtualizado = await prisma.pedido.update({
        where: { id },
        data: { status }
      })
      
      return reply.send(pedidoAtualizado)
    } catch (error) {
      console.error("Erro ao atualizar o status:", error)
      return reply.status(500).send({ message: "Erro interno ao atualizar status" })
    }
  })
}