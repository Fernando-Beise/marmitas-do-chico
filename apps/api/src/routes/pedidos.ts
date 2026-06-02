import { FastifyInstance } from 'fastify'
import { prisma } from '../db/client'
import { Prisma } from '@prisma/client'
import { whatsappClient } from '../services/whatsapp'


export async function pedidosRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    try {

      const configLoja = await prisma.lojaConfig.findUnique({ where: { id: "padrao" } });
        
      // Se a loja não existir na base ou estiver fechada, bloqueia a compra na hora!
      if (!configLoja || configLoja.aberta === false) {
          return reply.status(403).send({ 
              error: 'LOJA_FECHADA', 
              message: 'Os pedidos estão pausados no momento para produção. Tente novamente mais tarde.' 
          });
      }

      const body = request.body as any
      
      // LOG VITAL: Vai imprimir no terminal exatamente o que o front-end mandou
      console.log("📦 INFO RECEBIDOS:", JSON.stringify(body));

      let idDoUsuario = body.clienteId

      // 1. LÓGICA DO CLIENTE (Blindada)
      if (!idDoUsuario || idDoUsuario.includes("Ajustado")) {
        let clienteExistente = await prisma.cliente.findUnique({
          where: { telefone: body.dadosEntrega.telefone }
        })

        if (!clienteExistente) {
            clienteExistente = await prisma.cliente.create({
                data: {
                    nome: `${body.dadosEntrega.nome || ''} ${body.dadosEntrega.sobrenome || ''}`.trim(),
                    telefone: body.dadosEntrega.telefone
                }
            })
        }
        idDoUsuario = clienteExistente.id
      }
      

      // 2. LÓGICA DO ENDEREÇO 
      const novoEndereco = await prisma.endereco.create({
        data: {
          clienteId: idDoUsuario,
          cep: body.dadosEntrega.cep,
          rua: body.dadosEntrega.rua,
          numero: body.dadosEntrega.numero,
          bairro: body.dadosEntrega.bairro,
          // Caso o front-end falhe, garantimos a cidade padrão
          cidade: body.dadosEntrega.cidade || 'Santa Cruz do Sul', 
          estado: body.dadosEntrega.estado || 'RS',
          complemento: body.dadosEntrega.complemento || null
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

      try {
        // Verifica se o WhatsApp está conectado antes de tentar enviar
        if (whatsappClient.info && body.dadosEntrega?.telefone) {
          
          // Remove parênteses, traços e espaços do telemóvel da base de dados
          const telefoneLimpo = body.dadosEntrega.telefone.replace(/\D/g, '');
          
          // 2. Coloca o DDI do Brasil na frente, mas NÃO coloca o @c.us ainda
          const numeroBrasil = `55${telefoneLimpo}`;

          // 3. A MÁGICA: Pede ao WhatsApp para validar e descobrir o ID real (ele resolve o 9º dígito sozinho!)
          const idRegistrado = await whatsappClient.getNumberId(numeroBrasil);
          if (idRegistrado) {
            const mensagemConfirmacao = `Olá, *${body.dadosEntrega.nome}*! 👨‍🍳\n\nRecebemos o seu pedido!\n\nO Chico preparará sua marmita com muito carinho.\n\nAvisaremos por aqui quando começar a ser preparada e estiver a caminho. 🛵`;

            // Disparamos a mensagem SEM usar o 'await' antes.
            // Porquê? Para não fazer o site do cliente ficar a "pensar" à espera do WhatsApp.
            whatsappClient.sendMessage(idRegistrado._serialized, mensagemConfirmacao)
              .then(() => console.log(`[WHATSAPP] Confirmação de pedido enviada para ${body.dadosEntrega.nome}`))
              .catch(err => console.error(`[WHATSAPP] Erro ao enviar confirmação para ${body.dadosEntrega.nome}:`, err));
          }else{console.log(`[WHATSAPP] Número ${numeroBrasil} não registrado no WhatsApp. Não foi possível enviar a mensagem de confirmação.`)}
        }
      } catch (err) {
        // Se der qualquer erro no WhatsApp, não quebra a compra do cliente
        console.error("Erro no bloco de disparo do WhatsApp:", err);
      }

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
        data: { status },
        include: {
          cliente: true}
      })
      
      // ========================================================
        // 2. DISPARO AUTOMÁTICO DE WHATSAPP POR STATUS
        // ========================================================
        if (whatsappClient.info && pedidoAtualizado.cliente?.telefone) {
            (async () => {
                try {
                    const telefoneLimpo = pedidoAtualizado.cliente.telefone.replace(/\D/g, '');
                    const numeroBrasil = `55${telefoneLimpo}`;
                    const idRegistrado = await whatsappClient.getNumberId(numeroBrasil);

                    if (idRegistrado) {
                        const nome = pedidoAtualizado.cliente.nome;
                        let mensagem = '';

                        // 3. O "Switch" mágico que escolhe a mensagem certa com base no status
                        switch (status) {
                          case 'preparando':
                              mensagem = `Opa, ${nome}! 👨‍🍳\n\nO Chico acabou de colocar o seu pedido na grelha! Estamos a preparar a sua marmita com muito capricho. Avisamos quando sair!`;
                              break;
                          
                          case 'saiu_entrega':
                              mensagem = `Boas notícias, ${nome}! 🛵💨\n\nO seu pedido acabou de sair para entrega! Fique atento(a) ao portão/campainha.`;
                              break;
                          
                          case 'entregue':
                              mensagem = `Pedido entregue! 🎉\n\nEsperamos que você tenha um excelente almoço, ${nome}! Muito obrigado por escolher o Marmitas do Chico. Até a próxima! 😋`;
                              break;
                          
                          case 'cancelado':
                              mensagem = `Olá, ${nome}. O seu pedido precisou ser cancelado. A nossa equipe ja entrará em contato para proceder com o reembolso.😔\n\nSe tiver dúvidas, responda esta mensagem para falar conosco.`;
                              break;
                        }

                        // Só envia se o status for um dos mapeados acima
                        if (mensagem !== '') {
                            await whatsappClient.sendMessage(idRegistrado._serialized, mensagem);
                            console.log(`[WHATSAPP] Status '${status}' enviado para ${nome}`);
                        }else{
                            console.log(`[WHATSAPP] Status '${status}' não tem mensagem mapeada. Nenhuma mensagem enviada para ${nome}.`);
                        }
                    }else{
                        console.log(`[WHATSAPP] Número ${numeroBrasil} não registrado no WhatsApp. Não foi possível enviar a atualização de status '${status}'.`);
                    }
                } catch (err) {
                    console.error(`[WHATSAPP] Erro ao notificar status para o pedido ${id}:`, err);
                }
            })(); // Roda em segundo plano para o admin não ficar esperando a tela carregar
        }
        // ========================================================

        return reply.send(pedidoAtualizado);

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return reply.status(500).send({ error: 'Erro interno ao atualizar pedido' });
    }
  })
  // ROTA PARA ATUALIZAR MÚLTIPLOS PEDIDOS DE UMA VEZ
  app.patch('/bulk-status', async (request: any, reply) => {
    try {
        const { pedidoIds, novoStatus } = request.body;

        // 1. Validação básica
        if (!pedidoIds || !Array.isArray(pedidoIds) || pedidoIds.length === 0) {
            return reply.status(400).send({ error: "Nenhum pedido selecionado para atualização." });
        }
        if (!novoStatus) {
            return reply.status(400).send({ error: "O novo status é obrigatório." });
        }

        // 2. Atualiza todos os pedidos no Prisma num único comando rápido
        const updateResult = await prisma.pedido.updateMany({
            where: {
                id: { in: pedidoIds }
            },
            data: {
                status: novoStatus
            }
        });

        // ========================================================
        // 3. DISPARO DE WHATSAPP EM MASSA (COM DELAY DE SEGURANÇA)
        // ========================================================
        if (whatsappClient.info) {
            (async () => {
                try {
                    // Como o updateMany não devolve os dados completos, precisamos buscar os clientes
                    const pedidosAfetados = await prisma.pedido.findMany({
                        where: { id: { in: pedidoIds } },
                        include: { cliente: true }
                    });

                    for (const pedido of pedidosAfetados) {
                        if (pedido.cliente?.telefone) {
                            const telefoneLimpo = pedido.cliente.telefone.replace(/\D/g, '');
                            const numeroBrasil = `55${telefoneLimpo}`;
                            const idRegistrado = await whatsappClient.getNumberId(numeroBrasil);

                            if (idRegistrado) {
                                const nome = pedido.cliente.nome;
                                let mensagem = '';
                                
                                switch (novoStatus) {
                                    case 'preparando':
                                        mensagem = `Opa, ${nome}! 👨‍🍳\n\nO Chico acabou de colocar o seu pedido na grelha! Estamos a preparar a sua marmita com muito capricho.`;
                                        break;
                                    case 'saiu_entrega':
                                        mensagem = `Boas notícias, ${nome}! 🛵💨\n\nO seu pedido acabou de sair para entrega! Fique atento(a) ao portão/campainha.`;
                                        break;
                                    case 'entregue':
                                        mensagem = `Pedido entregue! 🎉\n\nEsperamos que você tenha um excelente almoço, ${nome}! Muito obrigado por escolher o Marmitas do Chico.`;
                                        break;
                                }

                                if (mensagem !== '') {
                                    await whatsappClient.sendMessage(idRegistrado._serialized, mensagem);
                                    console.log(`[WHATSAPP BULK] Status '${novoStatus}' enviado para ${nome}`);
                                    
                                    // DELAY DE 3 SEGUNDOS: Super importante ao mover dezenas de pedidos juntos!
                                    await new Promise(resolve => setTimeout(resolve, 3000));
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('[WHATSAPP BULK] Erro no envio em massa:', err);
                }
            })(); // Roda em background
        }
        // ========================================================

        // Responde ao Front-end imediatamente
        return reply.send({ success: true, atualizados: updateResult.count });

    } catch (error) {
        console.error('Erro na atualização em massa:', error);
        return reply.status(500).send({ error: 'Erro interno ao atualizar pedidos.' });
    }
  });
}