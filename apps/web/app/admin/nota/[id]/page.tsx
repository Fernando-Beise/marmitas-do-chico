'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Printer, ArrowLeft, UtensilsCrossed, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Importe sua API
import { api } from '@/services/api'

// Tipagem baseada no seu Prisma
type PedidoNota = {
  id: string
  status: string
  total: number
  taxaEntrega: number
  metodoEntrega: string
  metodoPagamento: string
  trocoPara: number | null
  criadoEm: string
  cliente: {
    nome: string
    telefone: string
  }
  endereco: {
    enderecoCompleto: string
    complemento: string | null
  } | null
  itens: {
    id: string
    quantidade: number
    precoUnitario: number
    prato: {
      nome: string
    }
  }[]
  pagamento: {
    id: string
    metodo: string
    status: string
    idTransacaoMp: string
    pagoEm: string
  }
}

export default function DeliveryNotePage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<PedidoNota | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Busca os dados do pedido no backend
  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const response = await api.get(`/pedidos/${orderId}`)
        setOrder(response.data)
      } catch (error) {
        console.error('Erro ao buscar detalhes da nota:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (orderId) {
      fetchPedido()
    }
  }, [orderId])

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Telas de carregamento e erro
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Gerando nota de entrega...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted">
        <p className="text-lg text-muted-foreground">Pedido não encontrado</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  // Cálculos
  const taxaEntrega = Number(order.taxaEntrega) || 0
  const subtotal = Number(order.total) - taxaEntrega

  return (
    <div className="min-h-screen bg-muted p-6">
      {/* Botões de Ação - Escondidos na hora de imprimir (classe no-print) */}
      <div className="no-print mx-auto mb-6 flex max-w-2xl items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos Detalhes
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Nota
        </Button>
      </div>

      {/* Papel da Nota Fiscal */}
      <div id="printable-receipt" className="mx-auto max-w-2xl bg-white p-8 text-black shadow-lg print:m-0 print:max-w-full print:shadow-none">
        
        {/* Cabeçalho */}
        <div className="mb-8 border-b border-border pb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">
            Marmitas do Chico
          </h1>
          <p className="text-muted-foreground">Pedido #{order.id.substring(0, 8).toUpperCase()}</p>
          <p className="text-sm text-muted-foreground">{formatDate(order.criadoEm)}</p>
        </div>

        {/* Informações do Cliente */}
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="mb-2 font-semibold text-foreground">Cliente:</h2>
            <p className="text-muted-foreground">{order.cliente?.nome || 'Sem Nome'}</p>
            <p className="text-muted-foreground">{order.cliente?.telefone}</p>
          </div>
          <div className="md:text-right">
            <h2 className="mb-2 font-semibold text-foreground">Entrega:</h2>
            <p className="capitalize text-muted-foreground">{order.metodoEntrega}</p>
            {order.endereco ? (
              <p className="text-muted-foreground">
                {order.endereco.enderecoCompleto}
                {order.endereco.complemento && ` (${order.endereco.complemento})`}
              </p>
            ) : (
              <p className="text-muted-foreground">Retirada no local</p>
            )}
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 font-semibold text-foreground">Item</th>
                <th className="py-2 text-center font-semibold text-foreground">Qtd</th>
                <th className="py-2 text-right font-semibold text-foreground">Preço</th>
                <th className="py-2 text-right font-semibold text-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.itens.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-3 text-foreground">{item.prato.nome}</td>
                  <td className="py-3 text-center text-foreground">
                    {item.quantidade}
                  </td>
                  <td className="py-3 text-right text-muted-foreground">
                    {formatCurrency(item.precoUnitario)}
                  </td>
                  <td className="py-3 text-right font-medium text-foreground">
                    {formatCurrency(Number(item.precoUnitario) * item.quantidade)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              {/* Linha de Subtotal */}
              <tr>
                <td colSpan={3} className="pt-4 text-right text-muted-foreground">
                  Subtotal:
                </td>
                <td className="pt-4 text-right text-foreground">
                  {formatCurrency(subtotal)}
                </td>
              </tr>
              {/* Linha de Taxa de Entrega (só mostra se houver) */}
              {taxaEntrega > 0 && (
                <tr>
                  <td colSpan={3} className="py-2 text-right text-muted-foreground">
                    Taxa de Entrega:
                  </td>
                  <td className="py-2 text-right text-foreground">
                    {formatCurrency(taxaEntrega)}
                  </td>
                </tr>
              )}
              {/* Linha de Total */}
              <tr>
                <td colSpan={3} className="py-4 text-right font-semibold text-foreground">
                  Total a Pagar:
                </td>
                <td className="py-4 text-right text-xl font-bold text-primary">
                  {formatCurrency(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Informações de Pagamento (Crucial para o entregador) */}
        <div className="mb-8 rounded-lg bg-muted/50 p-4">
          <h3 className="font-semibold text-foreground mb-2">Detalhes do Pagamento:</h3>
          <p className="text-sm uppercase text-muted-foreground">Método: <span className="font-bold text-foreground">{order.pagamento.metodo}</span></p>
          <p className="text-sm uppercase text-muted-foreground">Status: <span className="font-bold text-foreground">{order.pagamento.status}</span></p>
          
          {/* Se a pessoa pediu troco, o motoboy precisa ver isso em destaque! */}
          {order.trocoPara && (
            <p className="text-sm text-yellow-600 font-bold mt-1">
              LEVAR TROCO PARA: {formatCurrency(order.trocoPara)}
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Obrigado pela preferência! Bom apetite.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Desenvolvido por Fernando Beise Ferreira — Projeto Integrador UFSM
          </p>
        </div>
      </div>
      
      {/* Classe utilitária do Tailwind para sumir com os botões na hora de imprimir */}
      {/* Estilos avançados para impressão */}
      {/* Estilos avançados para impressão em formato de Cupom (80mm) */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* 1. Esconde a interface inteira do site */
          body * {
            visibility: hidden;
          }
          
          /* 2. Mostra apenas o recibo */
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }

          /* 3. Tira as margens que o navegador coloca por padrão na folha */
          @page {
            margin: 0;
          }
          
          /* 4. Transforma o recibo num cupom de 80mm (padrão de maquininha/ifood) */
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important; /* Largura exata da bobina */
            max-width: 80mm !important;
            padding: 5mm !important; /* Espaçamento interno menor */
            margin: 0;
            box-shadow: none;
            color: black;
          }

          /* 5. Reduz o tamanho das fontes para caber no papel pequeno */
          #printable-receipt h1 { font-size: 16px !important; margin-bottom: 4px; }
          #printable-receipt h2 { font-size: 14px !important; margin-bottom: 2px; }
          #printable-receipt p, 
          #printable-receipt td, 
          #printable-receipt th,
          #printable-receipt span { 
            font-size: 12px !important; 
          }

          /* 6. Aperta mais as tabelas e margens para economizar papel */
          #printable-receipt .mb-8 { margin-bottom: 15px !important; }
          #printable-receipt .pb-6 { padding-bottom: 10px !important; }
          #printable-receipt .pt-6 { padding-top: 10px !important; }
          #printable-receipt td, #printable-receipt th { padding: 4px 2px !important; }
          
          /* Esconde o ícone grande do topo para poupar espaço/tinta */
          #printable-receipt .w-12 { display: none; }
        }
      `}} />
    </div>
  )
}