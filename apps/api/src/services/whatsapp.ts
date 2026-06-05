// ============================================
// INICIALIZAÇÃO DO BAILEYS
// ============================================
// Salve este código em: src/services/whatsapp.ts

import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import fs from 'fs';

export let whatsappSocket: any = null
export const getWhatsappSocket = () => whatsappSocket;
let isWhatsappReady = false
let qrCodeAtual: string | null = null;
export const getQrCodeAtual = () => qrCodeAtual;
export async function initializeWhatsApp() {
  try {
    console.log('🔄 Inicializando WhatsApp com Baileys...')

    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    // ✅ Criar socket do Baileys (muito mais leve que whatsapp-web.js)
    whatsappSocket = makeWASocket({
      auth: state,
      browser: ['Chico Pratos Especiais', 'Safari', '1.0.0'],
      syncFullHistory: false // Não sincroniza histórico completo (economiza RAM)
    })

    // ============================================
    // EVENTOS DO BAILEYS
    // ============================================

    // Evento: Atualização de conexão
    whatsappSocket.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        qrCodeAtual = qr
        console.log('\nNovo QR code gerado. Aguardando leitura...')
      }

      if (connection === 'connecting') {
        console.log('⏳ Conectando ao WhatsApp...')
      } else if (connection === 'open') {
        isWhatsappReady = true
	qrCodeAtual = null
        console.log('✅ WhatsApp conectado com sucesso!')
        console.log(`📲 Conectado como: ${whatsappSocket.user?.name}`)
      } else if (connection === 'close') {
        isWhatsappReady = false
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut

        if (shouldReconnect) {
          console.log('🔄 Tentando reconectar ao WhatsApp...')
          setTimeout(() => initializeWhatsApp(), 3000)
        } else {
	   qrCodeAtual = null; 
	   console.log('❌ WhatsApp desconectado (logout). Limpando sessão...');
	   
	   if (whatsappSocket) {
               whatsappSocket.ev.removeAllListeners();
           }
	   try {
               // Apaga a pasta de sessão fisicamente do disco
               // ATENÇÃO: Confirme se a sua pasta se chama 'auth_info_baileys' mesmo
               fs.rmSync('./auth_info', { recursive: true, force: true });
               console.log('🗑️ Pasta de arquivos de sessão apagada com sucesso!');
           } catch (err) {
               console.log('Aviso: A pasta já não existia.');
           }
	   setTimeout(() => {	   
    	   // 2. A MÁGICA: Mandamos o sistema reiniciar com a "memória limpa" 
    	   // após 2 segundos para gerar um novo QR Code automaticamente!
    	   
        	console.log('🔄 Reiniciando serviço para gerar novo QR Code...');
        	initializeWhatsApp();
    	   }, 2000);
        }
      }
    })

    // Evento: Atualizar credenciais (IMPORTANTE para manter sessão)
    whatsappSocket.ev.on('creds.update', saveCreds)

    return whatsappSocket
  } catch (error) {
    console.error('❌ Erro ao inicializar WhatsApp:', error)
    throw error
  }
}

// Função para verificar se está pronto
export function isWhatsappConnected() {
  return isWhatsappReady && whatsappSocket?.user
}

// ============================================
// COMANDOS ÚTEIS DO BAILEYS
// ============================================
/*

// Enviar mensagem de texto simples
await whatsappSocket.sendMessage(jid, { text: 'Olá!' })

// Enviar imagem
await whatsappSocket.sendMessage(jid, {
  image: { url: 'https://example.com/img.jpg' },
  caption: 'Descrição da imagem'
})

// Enviar arquivo
await whatsappSocket.sendMessage(jid, {
  document: { url: 'https://example.com/doc.pdf' },
  fileName: 'documento.pdf'
})

// Enviar múltiplas mensagens
const mensagens = ['Oi', 'Tudo bem?', 'Como você está?']
for (const msg of mensagens) {
  await whatsappSocket.sendMessage(jid, { text: msg })
  await new Promise(r => setTimeout(r, 1000)) // 1 segundo entre mensagens
}

// Validar se número tem WhatsApp
const [existe] = await whatsappSocket.onWhatsApp('5511999999999')
if (existe?.exists) {
  console.log('✅ Número tem WhatsApp')
}

// Obter informações do número
const [info] = await whatsappSocket.onWhatsApp('5511999999999')
console.log('Nome:', info?.name)
console.log('Foto:', info?.picture)

// Marcar como lido
await whatsappSocket.readMessages([msg.key])

// Reagir com emoji
await whatsappSocket.sendMessage(jid, { react: { text: '❤️', key: msg.key } })

*/
