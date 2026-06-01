import { FastifyInstance } from 'fastify'
import { prisma } from '../db/client'
import { Prisma } from '@prisma/client'


export async function pedidosRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    try {
      const body = request.body as any
      
      // LOG VITAL: Vai imprimir no terminal exatamente o que o front-end mandou
      console.log("📦 INFO RECEBIDOS:", JSON.stringify(body));

      let idDoUsuario = body.clienteId

      // 1. LÓGICA DO CLIENTE (Blindada)
      if (!idDoUsuario || idDoUsuario.includes("Ajustado")) {
        let clienteExistente = await prisma.cliente.findUnique({
          where: { email: body.dadosEntrega.email }
        })

        if (!clienteExistente) {
            clienteExistente = await prisma.cliente.create({
                data: {
                    nome: `${body.dadosEntrega.nome || ''} ${body.dadosEntrega.sobrenome || ''}`.trim(),
                    telefone: body.dadosEntrega.telefone,
                    email: body.dadosEntrega.email 
                }
            })
        }
        idDoUsuario = clienteExistente.id
      }
      

      // 2. LÓGICA DO ENDEREÇO
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

      // 3. CRIAÇÃO DO PEDIDO (Refeita e 100% segura)
      const novoPedido = await prisma.pedido.create({
        data: {
          clienteId: idDoUsuario,
          enderecoId: novoEndereco.id,
          total: new Prisma.Decimal(body.total),
          status: 'pendente',
          itens: {
            create: body.itens.map((item: any) => {
              
              // Inteligência: pega a lista de onde quer que a tela de confirmação tenha mandado
              const listaAdicionais = item.adicionaisEscolhidos || item.adicionais || [];
              
              // Inteligência: Pega o ID real do prato
              const pratoId = item.pratoId && item.pratoId !== item.id ? item.pratoId : item.id;

              return {
                pratoId: pratoId,
                quantidade: Number(item.quantidade) || 1,
                precoUnitario: new Prisma.Decimal(item.precoUnitario || item.preco || 0),
                
                // VINCULANDO OS ADICIONAIS DE VERDADE
                adicionais: {
                  create: listaAdicionais.map((adic: any) => ({
                    adicionalId: adic.adicionalId || adic.id, // Pega o ID real do adicional
                    quantidade: Number(adic.quantidade) || 1,
                    precoCobrado: Number(adic.precoCobrado || adic.preco || 0)
                  }))
                }
              }
            })
          }
        }
      })
      
      

      // INTEGRAÇÃO COM PAYMENTS (Aceita Cartão e PIX via Token do Brick)
      const MERCADO_PAGO_TOKEN = process.env.MP_ACCESS_TOKEN
      let dadosDoPix = { qrCodeCopyPaste: "", qrCodeBase64: "" }
      let transacaoIdMp = "MOCK_" + novoPedido.id
      let statusPagamento = "pendente"
      let metodoPagamento = 'pix'
      

      if (MERCADO_PAGO_TOKEN && body.paymentData) {
        const mpFormData = body.paymentData?.formData || {}
        metodoPagamento = mpFormData.payment_method_id || 'pix'

        const isPix = metodoPagamento === 'pix'

        const mpBody: any = {
          type: "online",
          processing_mode: "automatic",
          total_amount: String(Number(body.total).toFixed(2)),
          external_reference: novoPedido.id,

          payer: {
            email: "test_user_br@testuser.com" // sandbox: obrigatório @testuser.com
          },

          transactions: {
            payments: [
              isPix
                ? {
                    // ✅ PIX - sem token, sem installments
                    amount: String(Number(body.total).toFixed(2)),
                    payment_method: {
                      id: "pix",
                      type: "bank_transfer"
                    },
                    expiration_time: "PT24H" // 24 horas, opcional
                  }
                : {
                    // ✅ CARTÃO - com token e installments
                    amount: String(Number(body.total).toFixed(2)),
                    payment_method: {
                      id: mpFormData.payment_method_id,  // "master", "visa", etc.
                      type: "credit_card",               // ou "debit_card"
                      token: mpFormData.token,
                      installments: Number(mpFormData.installments) || 1
                    }
                  }
            ]
          }
        }

        const mpResponse = await fetch('https://api.mercadopago.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
            'X-Idempotency-Key': `${novoPedido.id}-${Date.now()}`
          },
          body: JSON.stringify(mpBody)
        })

        const paymentResponse = await mpResponse.json()
        console.log("Resposta MP completa:", JSON.stringify(paymentResponse, null, 2))

        if (mpResponse.ok) {
          transacaoIdMp = String(paymentResponse.id)
          statusPagamento = paymentResponse.status // "processed", "action_required"

          // PIX: qr_code fica dentro de transactions.payments[0].payment_method
          if (isPix) {
            const pmData = paymentResponse.transactions?.payments?.[0]?.payment_method
            dadosDoPix.qrCodeCopyPaste = pmData?.qr_code ?? ""
            dadosDoPix.qrCodeBase64   = pmData?.qr_code_base64 ?? ""
          }
        } else {
          console.error("ERRO DO MERCADO PAGO:", paymentResponse)
          return reply.status(400).send({
            error: "Recusado pelo Mercado Pago",
            details: paymentResponse
          })
        }
      }

      // 5. REGISTRO DO PAGAMENTO
      await prisma.pagamento.create({
        data: {
          pedidoId: novoPedido.id,
          metodo: metodoPagamento.toUpperCase(),
          status: statusPagamento,
          idTransacaoMp: transacaoIdMp
        }
      })

      // Retorna para o Front-end saber o que mostrar na tela
      return reply.status(201).send({
        pedidoId: novoPedido.id,
        status: statusPagamento,
        metodo: metodoPagamento,
        pix: dadosDoPix.qrCodeCopyPaste ? dadosDoPix : null
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
            prato: true,
            adicionais: {
              include: {
                adicional: true 
              }
            }
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
        itens: { 
          include: { 
            prato: true,
            adicionais: {
              include: {
                adicional: true 
              }
            } 
          } 
        }
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