// ============================================
// INICIALIZAÇÃO DO BAILEYS
// ============================================
// Salve este código em: src/services/whatsapp.ts

import { default as makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'

let whatsappSocket: any = null
let isWhatsappReady = false
import qrcode from 'qrcode-terminal'
export async function initializeWhatsApp() {
  try {
    console.log('🔄 Inicializando WhatsApp com Baileys...')

    const { state, saveCreds } = await useMultiFileAuthState('auth_info')

    // ✅ Criar socket do Baileys (muito mais leve que whatsapp-web.js)
    whatsappSocket = makeWASocket({
      auth: state,
      browser: ['Marmitas do Chico', 'Safari', '1.0.0'],
      syncFullHistory: false // Não sincroniza histórico completo (economiza RAM)
    })

    // ============================================
    // EVENTOS DO BAILEYS
    // ============================================

    // Evento: Atualização de conexão
    whatsappSocket.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log('\n📱 Escaneie este QR Code no WhatsApp:\n')
        qrcode.generate(qr, { small: true }) // Renderiza QR visual
        console.log('\nOu acesse este link no WhatsApp:')
        console.log(qr) // Link como fallback
      }

      if (connection === 'connecting') {
        console.log('⏳ Conectando ao WhatsApp...')
      } else if (connection === 'open') {
        isWhatsappReady = true
        console.log('✅ WhatsApp conectado com sucesso!')
        console.log(`📲 Conectado como: ${whatsappSocket.user?.name}`)
      } else if (connection === 'close') {
        isWhatsappReady = false
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut

        if (shouldReconnect) {
          console.log('🔄 Tentando reconectar ao WhatsApp...')
          setTimeout(() => initializeWhatsApp(), 3000)
        } else {
          console.log('❌ WhatsApp desconectado (logout)')
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

// Função para obter o socket (usar nas rotas)
export function getWhatsappSocket() {
  return whatsappSocket
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