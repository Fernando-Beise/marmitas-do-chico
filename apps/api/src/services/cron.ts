
import cron from 'node-cron';
import { prisma } from '../db/client'; // Ajuste o caminho do prisma se necessário
import { getWhatsappSocket } from './whatsapp'; // IMPORTANTE: Puxe a função do bot aqui!

// A mágica: Essa expressão '*/5 * * * *' significa "Rode a cada 5 minutos"
export function iniciarRotinasDeLimpeza() {
  cron.schedule('*/5 * * * *', async () => {
    
    // Pega a hora atual do servidor
    const agora = new Date();
    
    // Calcula o tempo limite subtraindo os minutos/horas da hora atual
    const limitePix = new Date(agora.getTime() - 15 * 60000); // 15 min atrás
    const limiteCartao = new Date(agora.getTime() - 2 * 60 * 60000); // 2 horas atrás

    try {
      // 1. FAXINA DO PIX EXPIRADO
      const pixCancelados = await prisma.pedido.findMany({
        where: {
          status: 'aguardando_pix',
          criadoEm: { lt: limitePix }
        },
        include: { cliente: true } // Precisamos disso para o WhatsApp!
      });

      // 2. FAXINA DE CARTÕES "PRESOS" EM ANÁLISE
      const cartoesCancelados = await prisma.pedido.findMany({
        where: {
          status: 'em_analise',
          criadoEm: { lt: limiteCartao }
        },
        include: { cliente: true }
      });

      // ==========================================
      // FUNÇÃO AUXILIAR PARA CANCELAR E AVISAR
      // ==========================================
      const processarCancelamentos = async (pedidos: any[], motivo: 'pix' | 'cartao') => {
        for (const pedido of pedidos) {
          
          // A) Atualiza o status no banco de dados
          await prisma.pedido.update({
            where: { id: pedido.id },
            data: { status: 'cancelado' }
          });

          // B) Prepara a mensagem amigável
          let mensagem = '';
          if (motivo === 'pix') {
            mensagem = `Olá, *${pedido.cliente.nome}*. 👨‍🍳\n\nO tempo limite de 15 minutos para o pagamento do seu PIX expirou e o pedido foi cancelado.\n\nSe ainda estiver com fome, é só refazer o pedido no nosso site! 🛵`;
          } else {
            mensagem = `Olá, *${pedido.cliente.nome}*. 👨‍🍳\n\nInfelizmente a administradora do seu cartão demorou muito para responder ou recusou a transação, e o pedido foi cancelado por segurança.\n\nPor favor, tente fazer um novo pedido no site usando outro cartão ou PIX! 🛵`;
          }

          // C) Dispara o WhatsApp
          const socket = getWhatsappSocket();
          if (socket?.user && pedido.cliente?.telefone) {
            const telefoneLimpo = pedido.cliente.telefone.replace(/\D/g, '');
            const numeroBrasil = `55${telefoneLimpo}`;
            
            try {
              const validado = await socket.onWhatsApp(numeroBrasil);
              if (validado[0]?.exists) {
                await socket.sendMessage(validado[0].jid, { text: mensagem });
              }
            } catch (err) {
              console.error(`Falha ao avisar cliente ${pedido.cliente.nome} sobre cancelamento.`);
            }
          }
        }
      };

      // Executa os blocos se encontrar lixo no banco
      if (pixCancelados.length > 0) {
        console.log(`🧹 [FAXINA] Cancelando e avisando ${pixCancelados.length} clientes de PIX expirado...`);
        await processarCancelamentos(pixCancelados, 'pix');
      }

      if (cartoesCancelados.length > 0) {
        console.log(`🧹 [FAXINA] Cancelando e avisando ${cartoesCancelados.length} clientes de cartão travado...`);
        await processarCancelamentos(cartoesCancelados, 'cartao');
      }

    } catch (error) {
      console.error('❌ [FAXINA] Erro ao limpar pedidos expirados:', error);
    }
  });

  console.log('🕒 Rotinas de limpeza em segundo plano iniciadas.');
}
