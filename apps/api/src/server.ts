import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import path from 'path' 
import dotenv from 'dotenv'
import pQueue from 'p-queue'
import { getWhatsappSocket, initializeWhatsApp, getQrCodeAtual } from './services/whatsapp'
import { iniciarRotinasDeLimpeza } from './services/cron'
import { authRoutes } from './routes/auth'
import { pratosRoutes } from './routes/pratos'
import { pedidosRoutes } from './routes/pedidos'
import { contatosRoutes } from './routes/contatos'
import { adicionaisRoutes } from './routes/adicionais'
import { prisma } from './db/client'

const app = Fastify({ logger: true })

dotenv.config({ path: path.resolve(__dirname, '../.env') })

app.register(cors, { 
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
})
app.register(jwt, { secret: process.env.JWT_SECRET! })

app.get('/health', async () => {
  return { status: 'ok' }
})
app.register(authRoutes, { prefix: '/auth' }) 
app.register(pratosRoutes, { prefix: '/pratos' })
app.register(pedidosRoutes, { prefix: '/pedidos' })
app.register(contatosRoutes, { prefix: '/contatos' })
app.register(adicionaisRoutes, { prefix: '/adicionais' })
const start = async () => {
  try {
    await initializeWhatsApp()
    
    iniciarRotinasDeLimpeza();

    await app.listen({ port: 3001, host: '0.0.0.0' })
    console.log('API rodando em http://localhost:3001')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

const filaWhatsApp = new pQueue({
    concurrency: 1,
    interval: 5000,
    intervalCap: 1,
    timeout: 90000,
}); // Garante que as mensagens sejam enviadas uma a uma

start()

app.post('/webhooks/mercadopago', async (request, reply) => {
  
  console.log("Webhoock recebido")

  // O Mercado Pago só quer saber se a URL existe e responde 200
  reply.status(200).send({ received: true });
  const body: any = request.body;

  console.log("Body:", JSON.stringify(body));  
  // Verifica se é uma notificação de atualização de pagamento
  if (body?.type !== 'order' && body?.type !== 'payment'){console.log("Ignorado - tipo:", body?.type); return}

  
    const orderId = body?.data?.id;
    if (!orderId) {console.log("Sem orderId");return};

    try {
      // 2. A BLINDAGEM DE SEGURANÇA:
      // Vamos no servidor oficial do MP conferir se esse pagamento realmente existe e foi pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
        }
      });
      
      const orderData = await mpResponse.json();

	console.log("Order status:", orderData.status)
      // 3. O PIX CAIU NA CONTA?
      if (orderData.status !== 'approved') {console.log("Order não está approved, ignorando");return};
        
        // Lembra que mandamos o novoPedido.id no external_reference? Ele volta aqui!
        const idDoPedido = orderData.external_reference; 
        console.log("idDoPedido:", idDoPedido);
        if (!idDoPedido) {console.log("idDoPedido:", idDoPedido);return};

        // Verifica se o pedido já não foi aprovado antes para não mandar 2 vezes
        const pedidoAtual = await prisma.pedido.findUnique({
          where: { id: idDoPedido },
          include: { cliente: true } // Precisamos do telefone do cliente para o WhatsApp
        });

        if (!pedidoAtual || pedidoAtual?.status === 'APROVADO' || pedidoAtual?.status === 'approved') {console.log("Pedido não encontrado ou já aprovado");return}
	  const paymentId = orderData.transactions?.payments?.[0]?.id;          

          console.log(`✅ [WEBHOOK] PIX Aprovado! Atualizando pedido ${idDoPedido}...`);

          // Atualiza o Pagamento
	  let pagoEm = new Date();
          await prisma.pagamento.updateMany({
            where: { idTransacaoMp: String(paymentId) },
            data: { status: 'APROVADO', pagoEm: pagoEm }
          });

          // Atualiza o Pedido
          await prisma.pedido.update({
            where: { id: idDoPedido },
            data: { status: 'aprovado' }
          });

          // 4. A MÁGICA FINAL: Dispara o WhatsApp avisando que a comida vai ser feita!
          const socket = getWhatsappSocket();
          if (socket?.user && pedidoAtual?.cliente?.telefone) {
            const telefoneLimpo = pedidoAtual?.cliente?.telefone.replace(/\D/g, '');
            const numeroBrasil = `55${telefoneLimpo}`;
            
            const testado = await socket.onWhatsApp(numeroBrasil);
            
            if (testado[0]?.exists) {
              const msg = `Olá, *${pedidoAtual?.cliente.nome}*! 👨‍🍳\n\nBoa notícia: o seu PIX foi confirmado!\n\nO Chico já colocou sua marmita na linha de produção. Avisaremos quando o motoboy sair para entrega! 🛵`;
              socket.sendMessage(testado[0].jid, { text: msg }).catch(() => null);
            }
          }
        
      
    } catch (error) {
      console.error('❌ Erro crítico ao processar webhook do Mercado Pago:', error);
    }
  
});

// ROTA PARA VALIDAR NÚMERO DE WHATSAPP EM TEMPO REAL
app.post('/whatsapp/validar', async (request: any, reply) => {
    try {
        const { telefone } = request.body;

        if (!telefone) {
            return reply.send({ valido: false, erro: 'Telefone não fornecido.' });
        }
	const qrCode = getQrCodeAtual();
	if(qrCode) {
	    return reply.send({ status: 'aguardando_qr', qr: qrCode });
	}
        // TRAVA DE SEGURANÇA: Se o bot estiver offline, liberamos a venda para não dar prejuízo!
        if (!getWhatsappSocket().user) {
            return reply.send({ valido: true, aviso: 'WhatsApp offline, validação ignorada.' });
        }

        // Limpa e formata o número
        const telefoneLimpo = telefone.replace(/\D/g, '');
        const numeroBrasil = `55${telefoneLimpo}`;

        // Pergunta aos servidores da Meta se o número existe
        const validado = await getWhatsappSocket().onWhatsApp(numeroBrasil);
        console.log(`[DEBUG VALIDAÇÃO] Retorno do Baileys para ${numeroBrasil}:`, validado)
	if (validado?.[0]?.exists){
            return reply.send({ valido: true });
        } else {
            return reply.send({ valido: false, erro: 'Este número não possui um WhatsApp ativo.' });
        }

    } catch (error) {
        // Se der qualquer erro na rede, não bloqueamos o cliente de comprar
        console.error('Erro ao validar número:', error);
        return reply.send({ valido: true }); 
    }
});

app.post('/whatsapp/desconectar', async (request, reply) => {
    try {
        if (getWhatsappSocket()) {
            console.log('[WHATSAPP] Comando de desconexão recebido do painel...');
            
            try {
                // Tenta fazer o logout oficial enviando a requisição para a Meta
                await getWhatsappSocket().logout();
            } catch (logoutError) {
                console.log('[WHATSAPP] O websocket já estava fechado. Forçando a limpeza local...');
                
                // HACK SÊNIOR: Como o Baileys falhou em enviar o aviso, 
                // ele trava. Então nós mesmos acionamos o "gatilho" de desligamento!
                // O código 401 é o "DisconnectReason.loggedOut". 
                // Isso vai fazer o seu arquivo whatsapp.ts acionar o setTimeout e reiniciar!
                getWhatsappSocket().ev.emit('connection.update', {
                    connection: 'close',
                    lastDisconnect: {
                        error: { output: { statusCode: 401 } } 
                    }
                });
            }
        }
        
        return reply.send({ success: true, mensagem: 'WhatsApp desconectado com sucesso.' });
    } catch (error) {
        console.error('Erro geral ao tentar desconectar o WhatsApp:', error);
        return reply.status(500).send({ error: 'Erro interno ao desconectar.' });
    }
});

// 3. ROTA PARA DISPARAR O CARDÁPIO
    app.post('/whatsapp/disparar-cardapio', async (request: any, reply) => {
    try {
        if (!getWhatsappSocket() ||!getWhatsappSocket().user) {
            return reply.status(503).send({ error: "O WhatsApp ainda não está conectado ou pronto." });
        }

        const { mensagem } = request.body; // Recebe a mensagem do Front-end

        if (!mensagem) {
            return reply.status(400).send({ error: "A mensagem é obrigatória." });
        }

        // Vai à base de dados procurar todos os clientes que têm número de telemóvel registado
        const clientes = await prisma.cliente.findMany({
            where: {
                telefone: { not: '' },
                recebeNotificacoes: true
            },
            select: { nome: true, telefone: true }
        });

        if (clientes.length === 0) {
            return reply.status(404).send({ error: "Nenhum cliente com telefone encontrado na base de dados." });
        }

        let enviados = 0;
        let erros = 0;
        reply.send({ status: "enviando", total: clientes.length }); // Responde imediatamente para não deixar o cliente esperando
        (async () => {
            for (const cliente of clientes) {
                filaWhatsApp.add(async () => {
                    try {
                        // 1. Limpa o número do cliente (remove tudo que não for dígito)
                        const telefoneLimpo = cliente.telefone.replace(/\D/g, '');
                
                        const validado = await getWhatsappSocket().onWhatsApp(`55${telefoneLimpo}`);
                        if (validado && validado.length>0 && validado[0].exists) {

                            const jidCorreto = validado[0].jid;
                        
                            // Envia a mensagem personalizada
                            await getWhatsappSocket().sendMessage(jidCorreto, { text: mensagem });
                            enviados++;
                            console.log(`Mensagem enviada para ${cliente.nome} (${jidCorreto})`);
                        }
                    } catch (err: any) {
                        erros++;
                        console.error(`Erro ao enviar para ${cliente.nome} (${cliente.telefone}):`, err);
                        if (err.message.includes('Connection Closed') || err.message.includes('timeout')) {
                            console.log(`Aguardando 5s antes de retry para ${cliente.nome}...`);
                            await new Promise(resolve => setTimeout(resolve, 5000));
                            try {
                                const telefoneLimpo = cliente.telefone.replace(/\D/g, '');
                                const numeroBrasil = `55${telefoneLimpo}@s.whatsapp.net`;
                                await getWhatsappSocket().sendMessage(numeroBrasil, { text: mensagem });
                                enviados++;
                                erros--;
                                console.log(`Mensagem enviada para ${cliente.nome} (${telefoneLimpo}) no retry!`);
                            } catch (retryErr) {
                                console.error(`Retry falhou para ${cliente.nome} (${cliente.telefone}):`, retryErr);
                            }
                        }
                    }
                });
            }

            await filaWhatsApp.onIdle(); // Espera até que todas as mensagens sejam processadas
            console.log(`Envio concluído. Total: ${clientes.length}, Enviados: ${enviados}, Erros: ${erros}`);
        })();

    } catch (error) {
        console.error('Erro na rota de WhatsApp:', error);
        return reply.status(500).send({ error: "Erro interno ao processar envios." });
    }
    
});

// ROTA PARA O FRONT-END LER O QR CODE E O STATUS
app.get('/whatsapp/status', async (request, reply) => {
    // 1. Verifica se o bot já está conectado com sucesso
    const socket = getWhatsappSocket();
    if (socket?.user) {
        const idLimpo = getWhatsappSocket().user.id.split(':')[0];
        return reply.send({ 
            status: 'conectado',
            usuario: socket.user.name || idLimpo
        });
    }
    const qrCodeAtual = getQrCodeAtual();
    // 2. Verifica se existe um QR Code gerado aguardando leitura
    if (qrCodeAtual) {
        return reply.send({ status: 'aguardando_qr', qr: qrCodeAtual });
    }

    // 3. Se não tem usuário e não tem QR Code, está carregando/iniciando
    return reply.send({ status: 'carregando' });
});


app.get('/loja/status', async (request, reply) => {
    try {
        // Busca a configuração (ou cria a linha padrão se não existir ainda)
        let config = await prisma.lojaConfig.findUnique({ where: { id: "padrao" } });
        if (!config) {
            config = await prisma.lojaConfig.create({ data: { id: "padrao", aberta: true } });
        }

        let mensagemCalculada = "";

        // SÓ CALCULA O DIA SE A LOJA ESTIVER ABERTA
        if (config.aberta) {
            // Pega a hora atual forçando o fuso horário do Brasil (importante para a VPS!)
            const dataAtual = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
            const horaAtual = dataAtual.getHours();
            
            let dataEntrega = new Date(dataAtual);

            // Se for MEIO-DIA (12h) ou mais, a entrega é para AMANHÃ
            if (horaAtual >= 12) {
                dataEntrega.setDate(dataEntrega.getDate() + 1);
            }

            // PULAR FIM DE SEMANA (Se a entrega cair no Sábado ou Domingo, passa para Segunda)
            if (dataEntrega.getDay() === 6) { // 6 = Sábado
                dataEntrega.setDate(dataEntrega.getDate() + 2);
            } else if (dataEntrega.getDay() === 0) { // 0 = Domingo
                dataEntrega.setDate(dataEntrega.getDate() + 1);
            }

            // Formata o dia e o mês (ex: 03/04) e o nome do dia
            const diaFormatado = String(dataEntrega.getDate()).padStart(2, '0');
            
            // Array com os nomes dos dias para garantir que fica certinho
            const diasDaSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
            const nomeDia = diasDaSemana[dataEntrega.getDay()];

            mensagemCalculada = `Estas marmitas são produzidas e entregues para o almoço do dia ${diaFormatado} - ${nomeDia}.`;
        }

        return reply.send({ 
            aberta: config.aberta, 
            mensagem: mensagemCalculada 
        });

    } catch (error) {
        console.error('Erro ao buscar status da loja:', error);
        return reply.status(500).send({ error: 'Erro interno.' });
    }
});

// Rota para o Chico Ligar/Desligar a loja (Usada no Painel Admin)
app.patch('/loja/status', async (request: any, reply) => {
    try {
        const { aberta } = request.body;
        
        const config = await prisma.lojaConfig.upsert({
            where: { id: "padrao" },
            update: { aberta },
            create: { id: "padrao", aberta }
        });

        return reply.send(config);
    } catch (error) {
        return reply.status(500).send({ error: 'Erro ao atualizar status.' });
    }
});
