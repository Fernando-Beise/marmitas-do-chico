'use client'

import { useState, useEffect } from 'react'
import { Send, CheckCircle2, Loader2, AlertTriangle, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/services/api'

// Tipagens baseadas no seu Prisma
type Prato = {
  id: string
  nome: string
  preco: number
  disponivel: boolean
}

type ClienteContato = {
  id: string
  nome: string
  telefone: string
  recebeNotificacoes: boolean
}

export default function WhatsAppBroadcastPage() {
  const [pratos, setPratos] = useState<Prato[]>([])
  const [contatos, setContatos] = useState<ClienteContato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [isSending, setIsSending] = useState(false)
  const [isSent, setIsSent] = useState(false)

  // NOVO: Estado que guarda a mensagem editável
  const [messageText, setMessageText] = useState('')

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value))
  }

  // Busca os dados e monta a sugestão de mensagem
  useEffect(() => {
    const fetchDados = async () => {
      try {
        const [pratosRes, contatosRes] = await Promise.all([
          api.get('/pratos'),
          api.get('/contatos')
        ])
        
        const pratosRecebidos = pratosRes.data
        setPratos(pratosRecebidos)
        setContatos(contatosRes.data)

        // Gera a mensagem inicial como "sugestão" para o utilizador poder editar
        const availableMeals = pratosRecebidos.filter((m: Prato) => m.disponivel)
        if (availableMeals.length > 0) {
          let defaultMessage = `Bom dia! Confira o cardápio de hoje:\n\n`
          availableMeals.forEach((meal: Prato) => {
            defaultMessage += `- ${meal.nome} - ${formatCurrency(meal.preco)}\n`
          })
          defaultMessage += `\nPeça já pelo nosso site!\nhttps://marmitasdochico.com.br`
          setMessageText(defaultMessage)
        } else {
          // Se não houver pratos, coloca uma mensagem base de aviso
          setMessageText('Olá! Estamos a preparar novidades deliciosas para hoje. Em breve enviamos o cardápio!')
        }

      } catch (error) {
        console.error('Erro ao buscar dados para o WhatsApp:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDados()
  }, [])

  const activeContacts = contatos.filter((c) => c.recebeNotificacoes)
  const availableMeals = pratos.filter((m) => m.disponivel)

  // Simulação do envio 
  const handleSend = () => {
    setIsSending(true)
    setTimeout(() => {
      setIsSending(false)
      setIsSent(true)
    }, 2500) 
  }

  // Ecrã de Carregamento Inicial
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-whatsapp" />
        <p className="mt-4 text-muted-foreground">A preparar a integração...</p>
      </div>
    )
  }

  // Ecrã de Sucesso após Envio
  if (isSent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-whatsapp/20">
          <CheckCircle2 className="h-10 w-10 text-whatsapp" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">
          Mensagem Enviada!
        </h2>
        <p className="mb-8 text-muted-foreground text-center max-w-md">
          A sua mensagem personalizada foi disparada com sucesso para os {activeContacts.length} clientes da lista de transmissão.
        </p>
        <Button onClick={() => setIsSent(false)} variant="outline">
          Fazer novo envio
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Transmissão WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Reveja e personalize a mensagem antes de enviá-la aos seus clientes
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Painel Esquerdo: Edição e Controlos */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="h-5 w-5" />
                Conteúdo da Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Caixa de Texto Editável - O coração da funcionalidade */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Pode editar o texto livremente antes de enviar:
                </label>
                <textarea
                  className="flex min-h-[220px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={isSending}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Destinatários Ativos
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {activeContacts.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Clientes da lista</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pratos Sugeridos
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {availableMeals.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Ativos no cardápio</p>
                </div>
              </div>

              {activeContacts.length === 0 && (
                <div className="flex items-start gap-3 rounded-lg bg-yellow-50 p-4 text-yellow-800">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold">Nenhum cliente na lista</p>
                    <p>Você não possui clientes com a notificação ativada na página de Clientes.</p>
                  </div>
                </div>
              )}

              <Button
                className="w-full bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
                size="lg"
                onClick={handleSend}
                // O botão agora é bloqueado apenas se não houver clientes OU se ele apagar a mensagem inteira
                disabled={isSending || activeContacts.length === 0 || messageText.trim() === ''}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    A disparar...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Enviar Mensagem ({activeContacts.length} destinatários)
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: Pré-visualização do Telemóvel */}
        <div className="flex items-center justify-center">
          <div className="relative w-[320px]">
            <div className="rounded-[40px] border-8 border-foreground/20 bg-foreground/5 p-2 shadow-xl">
              <div className="overflow-hidden rounded-[32px] bg-card">
                
                <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-white text-xs">Chico</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Marmitas do Chico
                    </p>
                    <p className="text-[10px] text-white/70">Conta Comercial</p>
                  </div>
                </div>

                <div className="min-h-[400px] bg-[#e5ddd5] p-4 relative" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundSize: 'cover' }}>
                  
                  <div className="max-w-[90%] rounded-lg rounded-tr-none bg-[#dcf8c6] p-3 shadow-sm ml-auto relative">
                    <p className="whitespace-pre-wrap text-sm text-[#303030]">
                      {/* Aqui a magia acontece: reflete exatamente o que está na caixa de texto */}
                      {messageText || "A sua mensagem aparecerá aqui..."}
                    </p>
                    <p className="mt-1 text-right text-[10px] text-gray-500 flex justify-end items-center gap-1">
                      {new Date().toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      <CheckCircle2 className="h-3 w-3 text-blue-500" />
                    </p>
                  </div>

                </div>
              </div>
            </div>
            <div className="absolute left-1/2 top-2 h-5 w-24 -translate-x-1/2 rounded-b-xl bg-foreground/20" />
          </div>
        </div>
      </div>
    </div>
  )
}