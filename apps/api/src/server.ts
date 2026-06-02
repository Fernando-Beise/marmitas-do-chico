import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import path from 'path' 
import dotenv from 'dotenv'
import { whatsappClient } from './services/whatsapp'; // 1. Importe o cliente no topo
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
    await app.listen({ port: 3001, host: '0.0.0.0' })
    console.log('API rodando em http://localhost:3001')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

// ... (resto das suas importações e inicialização do app)

// 2. INICIALIZA O WHATSAPP JUNTO COM O SERVIDOR
whatsappClient.initialize().catch((err: any) => console.error("Erro ao iniciar WhatsApp", err));


// ROTA PARA VALIDAR NÚMERO DE WHATSAPP EM TEMPO REAL
app.post('/whatsapp/validar', async (request: any, reply) => {
    try {
        const { telefone } = request.body;

        if (!telefone) {
            return reply.send({ valido: false, erro: 'Telefone não fornecido.' });
        }

        // TRAVA DE SEGURANÇA: Se o bot estiver offline, liberamos a venda para não dar prejuízo!
        if (!whatsappClient.info) {
            return reply.send({ valido: true, aviso: 'WhatsApp offline, validação ignorada.' });
        }

        // Limpa e formata o número
        const telefoneLimpo = telefone.replace(/\D/g, '');
        const numeroBrasil = `55${telefoneLimpo}`;

        // Pergunta aos servidores da Meta se o número existe
        const idRegistrado = await whatsappClient.getNumberId(numeroBrasil);

        if (idRegistrado) {
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

// 3. ROTA PARA DISPARAR O CARDÁPIO
    app.post('/whatsapp/disparar-cardapio', async (request: any, reply) => {
    try {
        if (!whatsappClient.info) {
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

        for (const cliente of clientes) {
            // Remove parênteses, traços e espaços do telemóvel da base de dados
            const telefoneLimpo = cliente.telefone.replace(/\D/g, '');
            
            // 2. Coloca o DDI do Brasil na frente, mas NÃO coloca o @c.us ainda
            const numeroBrasil = `55${telefoneLimpo}`;

            // 3. A MÁGICA: Pede ao WhatsApp para validar e descobrir o ID real (ele resolve o 9º dígito sozinho!)
            const idRegistrado = await whatsappClient.getNumberId(numeroBrasil);
            
            // O whatsapp-web.js exige o formato número@c.us
            const numeroFormatado = `55${telefoneLimpo}@c.us`; // Assume que todos são do Brasil (+55). Ajuste se necessário.
            
            try {
                // Envia a mensagem personalizada
                await whatsappClient.sendMessage(numeroFormatado, mensagem);
                enviados++;
                console.log(`Mensagem enviada para ${cliente.nome} (${telefoneLimpo})`);
                
                // DELAY DE 3 SEGUNDOS para proteção contra banimento
                await new Promise(resolve => setTimeout(resolve, 3000));
            } catch (err) {
                console.error(`Erro ao enviar para ${cliente.nome}:`, err);
            }
        }

        return reply.send({ success: true, enviados, total: clientes.length });

    } catch (error) {
        console.error('Erro na rota de WhatsApp:', error);
        return reply.status(500).send({ error: "Erro interno ao processar envios." });
    }
});