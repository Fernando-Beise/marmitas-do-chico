import { FastifyInstance } from 'fastify'
import { prisma } from '../db/client'
import { Prisma } from '@prisma/client'
import { getWhatsappSocket, whatsappSocket } from '../services/whatsapp'
import { error } from 'node:console'


export async function pedidosRoutes(app: FastifyInstance) {
	function validarCPF(cpf: string): boolean {
  const cpfLimpo = cpf.replace(/\D/g, '')
  
  if (cpfLimpo.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false
  
  // Primeiro dígito
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpfLimpo[9])) return false
  
  // Segundo dígito
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpfLimpo[10])) return false
  
  return true
}

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

      
      const idsDosPratos = body.itens.map((item: any) => 
	item.pratoId && item.pratoId !== item.id ? item.pratoId : item.id
      );

      // 2. Vai ao banco UMA ÚNICA VEZ e busca as informações REAIS e IMUTÁVEIS desses pratos
      const pratosNoBanco = await prisma.prato.findMany({
	where: { 
          id: { in: idsDosPratos } 
        }
      });

      // 3. Validação de Disponibilidade: Faltou algum prato?
      if (pratosNoBanco.length !== idsDosPratos.length) {
	return reply.status(400).send({
           error: 'Ops! Um ou mais itens do seu carrinho não estão mais disponíveis no cardápio.'
        });
      }

      // 4. Validação Anti-Fraude (Preços): Compara o valor do Front com o valor do Banco
      for (const item of body.itens) {
	const pratoIdFront = item.pratoId && item.pratoId !== item.id ? item.pratoId : item.id;
    
        // Acha o prato verdadeiro correspondente a este item
	const pratoOriginal = pratosNoBanco.find(p => p.id === pratoIdFront);

	if (!pratoOriginal) continue;

        // Converte os preços para Number para garantir uma comparação matemática perfeita.
	// Lida com Prisma Decimal convertendo para número.
	const precoFront = Number(item.precoUnitario || item.preco || 0);
	const precoBanco = Number(pratoOriginal.preco); // Substitua 'preco' pelo nome exato da coluna no seu banco

	// Usamos uma diferença mínima de centavos (0.01) para evitar bugs de arredondamento do JavaScript
	if (Math.abs(precoFront - precoBanco) > 0.01) {
	   console.warn(`🚨 ALERTA ANTI-FRAUDE: Bloqueado! Tentativa de enviar prato ${pratoOriginal.nome} por R$${precoFront}. Preço real: R$${precoBanco}`);
      
   	   return reply.status(400).send({
      	      error: "Inconsistência nos valores do pedido. Por favor, atualize a página e tente novamente."
           });
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
      
      // 🛠️ FUNÇÃO AUXILIAR DE LIMPEZA (Cascata Manual)
      // Criamos esta função aqui para reaproveitar em todos os cenários de falha.
      // IMPORTANTE: Ajuste os nomes "pedidoAdicional" e "itemPedido" caso estejam diferentes no seu schema.prisma
      const limparRascunho = async () => {
	 try {
	    console.warn(`Limpando pedido rascunho ${novoPedido.id} e seus agregados...`);
  	    await prisma.$transaction([
               prisma.itemPedidoAdicional.deleteMany({
                  where: { itemPedido: { pedidoId: novoPedido.id } }
               }),
               prisma.itemPedido.deleteMany({
                  where: { pedidoId: novoPedido.id }
               }),
               prisma.pedido.delete({
                  where: { id: novoPedido.id }
               })
            ]);
         } catch (err) {
            console.error("⚠️ Erro silencioso ao tentar limpar o rascunho:", err);
         }
      };

      // INTEGRAÇÃO COM PAYMENTS (Aceita Cartão e PIX via Token do Brick)
      const MERCADO_PAGO_TOKEN = process.env.MP_ACCESS_TOKEN
      const mpFormData = body.paymentData?.formData || {}
      const metodoPagamento = mpFormData.payment_method_id || 'pix'
      const isPix = metodoPagamento === 'pix'
      const emailPagador = body.paymentData?.formData?.payer?.email?.trim()

      if(!emailPagador || !emailPagador.includes('@')) {
	await limparRascunho();
	return reply.status(400).send({ error: "Email válido é obrigatório." })
      }

      let transacaoIdMp = "MP_" + novoPedido.id
      let statusPagamento = "pendente"

      const cpfPagador = body.dadosEntrega?.cpf?.replace(/\D/g, '') || "";

      //  VALIDAÇÃO: Email é obrigatório
      console.log("Email:", emailPagador)

      if(isPix && !validarCPF(cpfPagador)) {
          return reply.status(400).send({
             error: "CPF válido é obrigatório para PIX",
             cpf_recebido: cpfPagador
          })
      }

      let payer: any = {
          email: emailPagador
      }

      if (isPix) {
          const telefoneLimpo = body.dadosEntrega.telefone.replace(/\D/g, '')
          let complemento = body.dadosEntrega.complemento
          if(complemento === ''){ complemento = 'Não Informado'}
          payer = {
          email: emailPagador,
          phone: {
             area_code: telefoneLimpo.slice(0, 2),
             number: telefoneLimpo.slice(2)
          },
          identification: {
             type: "CPF",
             number: cpfPagador  // ✅ Usa o CPF que veio do frontend
          },
          address: {
             zip_code: body.dadosEntrega.cep,
             street_name: body.dadosEntrega.rua,
             street_number: body.dadosEntrega.numero,
             state: body.dadosEntrega.estado,
             complement: complemento
          }
          }
       }



      const mpBody: any = {
         type: "online",
         processing_mode: "automatic",
         total_amount: String(Number(body.total).toFixed(2)),
         external_reference: novoPedido.id,
         payer,
         transactions: {
            payments: [
                isPix
                   ? {
                      amount: String(Number(body.total).toFixed(2)),
                      payment_method: {
                         id: "pix",
                         type: "bank_transfer"
                      },
                      expiration_time: "PT15M"
                    }
                  : {
                      amount: String(Number(body.total).toFixed(2)),
                      payment_method: {
                         id: mpFormData.payment_method_id,
                         type: "credit_card",
                         token: mpFormData.token,
                         installments: Number(mpFormData.installments) || 1
                      }
                    }
            ]
         }
      }
	
      console.log(`${novoPedido.id} - ${JSON.stringify(mpBody)}`);
	
      try {
        const mpResponse = await fetch('https://api.mercadopago.com/v1/orders', {
        method: 'POST',
        headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${MERCADO_PAGO_TOKEN}`,
           'X-Idempotency-Key': `${novoPedido.id}-${Date.now()}`
        },
           body: JSON.stringify(mpBody),
        })

        const paymentResponse = await mpResponse.json()
    
        console.log(" Resposta MP:", JSON.stringify(paymentResponse, null, 2))

        if (!mpResponse.ok || paymentResponse.status === 'failed') {
           
	   await limparRascunho()
	   
	   return reply.status(400).send({
	      error: "Pagamento não aprovado pela operadora.",
	      details: paymentResponse.status_detail || paymentResponse.message
	   })
	}
	
	let statusParaOChico = "processando"
	let dadosDoPix = {qrCodeCopyPaste: "", qrCodeBase64: "" }

           if (isPix) {
	      const pmData = paymentResponse.transactions?.payments?.[0]?.payment_method;
              statusParaOChico = 'aguardando_pix'
  	      dadosDoPix.qrCodeCopyPaste = pmData?.qr_code ?? ""
  	      dadosDoPix.qrCodeBase64 = pmData?.qr_code_base64 ?? ""
  
  	      console.log("\n✅ Resultado final:")
  	      console.log("QR Code Copy/Paste:", dadosDoPix.qrCodeCopyPaste ? "✅" : "❌")
  	      console.log("QR Code Base64:", dadosDoPix.qrCodeBase64 ? "✅" : "❌")
        
              // Validação: PIX sem QR code?
              if (!dadosDoPix.qrCodeCopyPaste) {
                 console.warn(" PIX gerado mas sem QR code")
              }
           } else if (paymentResponse.status === 'in_review'){
	      statusParaOChico = 'em_analise'
	   } else if (paymentResponse.status === 'approved'){
	      statusParaOChico = 'aprovado'
	   } else {
	      statusParaOChico = 'new state'
	   }
	   let pagoEm = statusParaOChico === 'aprovado'? new Date() : null;
           
      
	   // 5. REGISTRO DO PAGAMENTO
           await prisma.pagamento.create({
      	     data: {
          	pedidoId: novoPedido.id,
          	metodo: metodoPagamento.toUpperCase(),
          	status: statusParaOChico,
          	idTransacaoMp: String(paymentResponse.id),
		pagoEm: pagoEm
      	     }
           })
	   await prisma.pedido.update({
      	     where: { id: novoPedido.id },
	     data: { status: statusParaOChico }
	   })

	   if(statusParaOChico === 'aprovado') {
	     const socket = getWhatsappSocket();
	     if (socket?.user && body.dadosEntrega?.telefone) {
          	// Remove parênteses, traços e espaços do telemóvel da base de dados
          	const telefoneLimpo = body.dadosEntrega.telefone.replace(/\D/g, '');
          
          	// 2. Coloca o DDI do Brasil na frente, mas NÃO coloca o @c.us ainda
          	const numeroBrasil = `55${telefoneLimpo}`;

          	// 3. A MÁGICA: Pede ao WhatsApp para validar e descobrir o ID real (ele resolve o 9º dígito sozinho!)
          	const validado = await socket.onWhatsApp(numeroBrasil);
          
		if (validado && validado.length > 0 && validado[0].exists) {
            	   const mensagemConfirmacao = `Olá, *${body.dadosEntrega.nome}*! 👨‍🍳\n\nRecebemos o seu pedido!\n\nO Chico preparará sua marmita com muito carinho.\n\nAvisaremos por aqui quando começar a ser preparada e estiver a caminho. 🛵`;
	    	   const jidCorreto = validado[0].jid;
            	   // Disparamos a mensagem SEM usar o 'await' antes.
             	   // Porquê? Para não fazer o site do cliente ficar a "pensar" à espera do WhatsApp.
            
		   socket.sendMessage(jidCorreto, { text: mensagemConfirmacao })
              	     .then(() => console.log(`[WHATSAPP] Confirmação de pedido enviada para ${body.dadosEntrega.nome}`))
                     .catch(() => console.error(`[WHATSAPP] Erro ao enviar confirmação para ${body.dadosEntrega.nome}:`));
          	 }else{console.log(`[WHATSAPP] Número ${numeroBrasil} não registrado no WhatsApp. Não foi possível enviar a mensagem de confirmação.`)}
              }
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

      await limparRascunho();
      return reply.status(503).send({ error: "Erro interno no servidor." })
    }
   }catch (error) {
  console.error("Erro interno do servidor:", error)
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
    // Função helper pra garantir que o socket está pronto
    async function aguardarWhatsApp(maxTentativas = 5) {
       for (let i = 0; i < maxTentativas; i++) {
           if (whatsappSocket?.user) {
               return true;
           }
           console.log(`⏳ Aguardando WhatsApp... (${i + 1}/${maxTentativas})`);
           await new Promise(r => setTimeout(r, 2000));
       }
       return false;
    }
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
        if (pedidoAtualizado.cliente?.telefone) {
            (async () => {
                try {
                    const telefoneLimpo = pedidoAtualizado.cliente.telefone.replace(/\D/g, '');
                    const numeroBrasil = `55${telefoneLimpo}`;
                    const validado = await whatsappSocket.onWhatsApp(numeroBrasil);

                    if (validado && validado.length > 0 && validado[0].exists) {
                        const nome = pedidoAtualizado.cliente.nome;
                        let mensagem = '';
			const jidCorreto = validado[0].jid
                        // 3. O "Switch" mágico que escolhe a mensagem certa com base no status
                        switch (status) {
                          case 'preparando':
                              mensagem = `Opa, ${nome}! 👨‍🍳\n\nO Chico acabou de colocar o seu pedido na grelha! Estamos a preparar a sua marmita com muito capricho. Avisamos quando sair!`;
                              break;
                          
                          case 'saiu_entrega':
                              mensagem = `Boas notícias, ${nome}! 🛵💨\n\nO seu pedido acabou de sair para entrega! Fique atento(a) ao portão/campainha.`;
                              break;
                          
                          case 'entregue':
                              mensagem = `Pedido entregue! 🎉\n\nEsperamos que você tenha um excelente almoço, ${nome}! Muito obrigado por escolher o Chico Pratos Especiais. Até a próxima! 😋`;
                              break;
                          
                          case 'cancelado':
                              mensagem = `Olá, ${nome}. O seu pedido precisou ser cancelado. A nossa equipe ja entrará em contato para proceder com o reembolso.😔\n\nSe tiver dúvidas, responda esta mensagem para falar conosco.`;
                              break;
                        }

                        // Só envia se o status for um dos mapeados acima
                        if (mensagem !== '') {
                            await whatsappSocket.sendMessage(jidCorreto, { text: mensagem });
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
    // Função helper pra garantir que o socket está pronto
    async function aguardarWhatsApp(maxTentativas = 5) {
       for (let i = 0; i < maxTentativas; i++) {
           if (whatsappSocket?.user) {
               return true;
           }
           console.log(`⏳ Aguardando WhatsApp... (${i + 1}/${maxTentativas})`);
           await new Promise(r => setTimeout(r, 2000));
       }
       return false;
    }
    try {
	const pronto = await aguardarWhatsApp();
    	if (!pronto) {
            console.log('[WHATSAPP] Timeout aguardando conexão');
            return;
        }
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
        if (whatsappSocket?.user) {
            (async () => {
                try {
		    const pronto = await aguardarWhatsApp();
            	    if (!pronto) {
                	console.log('[WHATSAPP] Timeout aguardando conexão');
                	return;
            	    }
                    // Como o updateMany não devolve os dados completos, precisamos buscar os clientes
                    const pedidosAfetados = await prisma.pedido.findMany({
                        where: { id: { in: pedidoIds } },
                        include: { cliente: true }
                    });

                    for (const pedido of pedidosAfetados) {
                        if (pedido.cliente?.telefone) {
                            const telefoneLimpo = pedido.cliente.telefone.replace(/\D/g, '');
                            const numeroBrasil = `55${telefoneLimpo}`;
                            const validado = await whatsappSocket.onWhatsApp(numeroBrasil);

                            if (validado && validado.length > 0 && validado[0].exists) {
                                const nome = pedido.cliente.nome;
                                let mensagem = '';
				const jidCorreto = validado[0].jid
                                
                                switch (novoStatus) {
                                    case 'preparando':
                                        mensagem = `Opa, ${nome}! 👨‍🍳\n\nO Chico acabou de colocar o seu pedido na grelha! Estamos a preparar a sua marmita com muito capricho.`;
                                        break;
                                    case 'saiu_entrega':
                                        mensagem = `Boas notícias, ${nome}! 🛵💨\n\nO seu pedido acabou de sair para entrega! Fique atento(a) ao portão/campainha.`;
                                        break;
                                    case 'entregue':
                                        mensagem = `Pedido entregue! 🎉\n\nEsperamos que você tenha um excelente almoço, ${nome}! Muito obrigado por escolher o Chico Pratos Especiais.`;
                                        break;
                                }

                                if (mensagem !== '') {
                                    await whatsappSocket.sendMessage(jidCorreto, { text: mensagem });
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
