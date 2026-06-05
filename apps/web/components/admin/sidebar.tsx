'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  MessageCircle,
  FileText,
  Smartphone, // Ícone para o botão do WhatsApp
  LogOut,     // Ícone para desconectar
  X           // Ícone para fechar o modal
} from 'lucide-react'
import { cn } from '@/lib/utils'

const menuItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Cardápio', href: '/admin/cardapio', icon: UtensilsCrossed },
  { name: 'Pedidos', href: '/admin/pedidos', icon: ClipboardList },
  { name: 'Contatos WhatsApp', href: '/admin/contatos', icon: MessageCircle },
  { name: 'Relatórios', href: '/admin/relatorios', icon: FileText },
]

export function AdminSidebar() {
  const pathname = usePathname()
  
  // Estados do WhatsApp
  const [modalAberto, setModalAberto] = useState(false)
  const [status, setStatus] = useState('carregando')
  const [qrCode, setQrCode] = useState('')
  const [usuario, setUsuario] = useState('')

  // Busca o status do WhatsApp no Back-end
  const verificarStatus = async () => {
    try {
      const resposta = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/whatsapp/status`)
      const dados = await resposta.json()
      
      setStatus(dados.status)
      if (dados.qr) setQrCode(dados.qr)
      if (dados.usuario) setUsuario(dados.usuario)
    } catch (erro) {
      console.error("Erro ao buscar status do WhatsApp:", erro)
    }
  }

  useEffect(() => {
    verificarStatus(); // Verifica assim que o menu carrega
    
    // Se o modal estiver aberto, checa a cada 3 segundos. Se fechado, a cada 15 segundos para atualizar o botão.
    const intervalo = setInterval(verificarStatus, modalAberto ? 3000 : 15000)
    return () => clearInterval(intervalo)
  }, [modalAberto])

  const handleDesconectar = async () => {
    if(!confirm("Tem certeza que deseja desconectar o WhatsApp? O sistema parará de enviar notificações.")) return;
    
    setStatus('carregando')
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/whatsapp/desconectar`, { method: 'POST' })
      setUsuario('')
      setQrCode('')
      verificarStatus() 
    } catch (error) {
      console.error("Erro ao desconectar:", error)
    }
  }

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar flex flex-col">
        {/* CABEÇALHO DO MENU */}
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary">
            <UtensilsCrossed className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <span className="font-bold text-sidebar-foreground">
              Chico Pratos Especiais
            </span>
            <p className="text-xs text-muted-foreground">Painel Admin</p>
          </div>
        </div>

        {/* NAVEGAÇÃO PRINCIPAL */}
        <nav className="p-4 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* RODAPÉ DO MENU COM OS BOTÕES */}
        <div className="p-4 border-t border-sidebar-border shrink-0 flex flex-col gap-2 bg-sidebar">
          
          {/* BOTÃO DO WHATSAPP (Dinâmico) */}
          <button
            onClick={() => setModalAberto(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-background px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Smartphone className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate text-left">
              {status === 'conectado' ? (usuario || 'Conectado') : 'Conectar WhatsApp'}
            </span>
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                status === 'conectado' ? "bg-green-500" : status === 'aguardando_qr' ? "bg-yellow-500" : "bg-gray-400"
              )}
            />
          </button>

          {/* BOTÃO VER LOJA */}
          <Link
            href="/"
            className="block w-full rounded-lg border border-sidebar-border bg-sidebar-accent px-4 py-2 text-center text-sm font-medium text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/80"
          >
            Ver Loja
          </Link>
        </div>
      </aside>

      {/* MODAL DE CONEXÃO DO WHATSAPP */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-6 relative">
            
            <button 
              onClick={() => setModalAberto(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold text-foreground mb-6">Conexão do Sistema</h2>

            {status === 'carregando' && (
              <div className="py-12 flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">Comunicando com o servidor...</p>
              </div>
            )}

            {status === 'aguardando_qr' && qrCode && (
              <div className="flex flex-col items-center text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Abra o WhatsApp no aparelho da loja, vá em <strong className="text-foreground">"Aparelhos Conectados"</strong> e escaneie o código abaixo:
                </p>
                <div className="p-4 border-2 border-dashed border-border rounded-xl bg-muted/30">
                  <QRCode value={qrCode} size={220} />
                </div>
                <p className="text-xs text-primary font-medium animate-pulse">
                  Aguardando leitura...
                </p>
              </div>
            )}

            {status === 'conectado' && (
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mb-2">
                  ✓
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">Tudo pronto!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conectado na conta: <strong className="text-foreground">{usuario || 'WhatsApp'}</strong>
                  </p>
                </div>
                
                <button 
                  onClick={handleDesconectar}
                  className="w-full py-2.5 px-4 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg font-semibold transition-colors flex justify-center items-center gap-2 text-sm"
                >
                  <LogOut className="h-4 w-4" />
                  Desconectar Dispositivo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
