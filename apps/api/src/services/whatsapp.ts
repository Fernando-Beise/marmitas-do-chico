import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

// O LocalAuth guarda a sessão para que o Chico não tenha de ler o QR Code 
// sempre que o servidor for reiniciado.
export const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

whatsappClient.on('qr', (qr) => {
    console.log('\n==================================================');
    console.log('⚠️ AÇÃO NECESSÁRIA: LEITURA DE QR CODE');
    console.log('Abra o WhatsApp no telemóvel do Chico e leia o QR Code abaixo:');
    qrcode.generate(qr, { small: true });
    console.log('==================================================\n');
});

whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp conectado com sucesso e pronto para disparar mensagens!');
});

whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ Falha na autenticação do WhatsApp:', msg);
});