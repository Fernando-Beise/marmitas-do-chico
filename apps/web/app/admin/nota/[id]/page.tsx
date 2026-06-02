'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Printer, ArrowLeft, UtensilsCrossed, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { api } from '@/services/api'

// Tipagem baseada no seu Prisma + Adicionais
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
    rua: string
    numero: string
    bairro: string
    cidade: string
    estado: string
    complemento: string | null
  } | null
  itens: {
    id: string
    quantidade: number
    precoUnitario: number
    prato: {
      nome: string
    }
    adicionais?: {
      quantidade: number
      precoCobrado: number
      adicional?: {
        nome: string
      }
    }[]
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

  const taxaEntrega = Number(order.taxaEntrega) || 0
  const subtotal = Number(order.total) - taxaEntrega

  return (
    <div className="min-h-screen bg-muted p-6">
      <div className="no-print mx-auto mb-6 flex max-w-2xl items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos Detalhes
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Cupom
        </Button>
      </div>

      <div id="printable-receipt" className="mx-auto max-w-2xl bg-white p-8 text-black shadow-lg print:m-0 print:max-w-full print:shadow-none">
        
        {/* Cabeçalho */}
        <div className="mb-4 border-b border-gray-300 pb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-black">
            Marmitas do Chico
          </h1>
          <p className="text-sm font-semibold">Pedido #{order.id.substring(0, 8).toUpperCase()}</p>
          <p className="text-xs text-gray-600">{formatDate(order.criadoEm)}</p>
        </div>

        {/* Informações do Cliente */}
        <div className="mb-4 border-b border-gray-300 pb-4">
          <h2 className="mb-1 font-bold text-black uppercase text-sm">Cliente:</h2>
          <p className="text-sm font-medium">{order.cliente?.nome || 'Sem Nome'} - {order.cliente?.telefone}</p>
          
          <h2 className="mt-3 mb-1 font-bold text-black uppercase text-sm">Entrega:</h2>
          <p className="text-sm font-medium capitalize">{order.metodoEntrega}</p>
          {order.endereco ? (
            <p className="text-sm">
              {order.endereco?.cidade} - {order.endereco?.estado} <br />
              {order.endereco?.rua}, {order.endereco?.numero} - {order.endereco?.bairro}
              
              {order.endereco.complemento && ` (${order.endereco.complemento})`}
            </p>
          ) : (
            <p className="text-sm">Retirada no local</p>
          )}
        </div>

        {/* Tabela de Itens */}
        <div className="mb-4 border-b border-gray-300 pb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="py-2 font-bold text-black w-10">Qtd</th>
                <th className="py-2 font-bold text-black">Item</th>
                <th className="py-2 font-bold text-black text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.itens.map((item) => {
                const baseTotal = Number(item.precoUnitario) * item.quantidade;
                const addonsTotal = item.adicionais?.reduce((acc, adic) => acc + (Number(adic.precoCobrado) * adic.quantidade), 0) || 0;
                const linhaTotal = baseTotal + addonsTotal;

                return (
                  <tr key={item.id} className="border-b border-gray-200 border-dashed align-top">
                    {/* Linha da quantidade */}
                    <td className="py-3 font-bold text-black">{item.quantidade}x</td>
                    
                    {/* Coluna do Prato + Adicionais (Na mesma célula para não quebrar tabelas pequenas) */}
                    <td className="py-3">
                      <div className="font-bold text-black">{item.prato.nome}</div>
                      
                      {item.adicionais && item.adicionais.length > 0 && (
                        <div className="mt-1 text-xs text-gray-700">
                          {item.adicionais.map((adic, idx) => (
                            <div key={idx}>└─ {adic.quantidade}x {adic.adicional?.nome || 'Adic. Excluído'}</div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Total daquela marmita inteira */}
                    <td className="py-3 text-right font-medium">
                      {formatCurrency(linhaTotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-3 text-right text-sm">Subtotal:</td>
                <td className="pt-3 text-right text-sm">{formatCurrency(subtotal)}</td>
              </tr>
              {taxaEntrega > 0 && (
                <tr>
                  <td colSpan={2} className="py-1 text-right text-sm">Taxa de Entrega:</td>
                  <td className="py-1 text-right text-sm">{formatCurrency(taxaEntrega)}</td>
                </tr>
              )}
              <tr>
                <td colSpan={2} className="py-3 text-right font-bold text-base text-black">Total a Pagar:</td>
                <td className="py-3 text-right font-bold text-base text-black">
                  {formatCurrency(order.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Informações de Pagamento */}
        <div className="mb-6 rounded border border-black p-3 text-center">
          <h3 className="font-bold text-black text-sm uppercase">Detalhes do Pagamento</h3>
          <p className="text-sm font-semibold mt-1">
            {order.pagamento?.metodo || 'N/A'} - {order.pagamento?.status.toUpperCase() || 'N/A'}
          </p>
          
          {order.trocoPara && (
            <p className="text-sm font-bold mt-2 uppercase border-t border-dashed border-black pt-2">
              Levar troco para: {formatCurrency(order.trocoPara)}
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="text-center text-xs">
          <p className="font-semibold text-black">Obrigado pela preferência!</p>
          <p className="mt-2 text-gray-500">
            Dev: Fernando Beise Ferreira
          </p>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          @page { margin: 0; }
          
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 3mm 4mm !important;
            margin: 0;
            box-shadow: none;
            color: black;
          }

          /* Fontes adaptadas para o papel de maquininha */
          #printable-receipt h1 { font-size: 16px !important; margin-bottom: 2px; }
          #printable-receipt h2 { font-size: 13px !important; margin-bottom: 1px; }
          #printable-receipt p, 
          #printable-receipt td, 
          #printable-receipt th,
          #printable-receipt span,
          #printable-receipt div { 
            font-size: 12px !important; 
          }

          /* Aperto de CSS para não gastar bobina térmica à toa */
          #printable-receipt .mb-4 { margin-bottom: 8px !important; }
          #printable-receipt .pb-4 { padding-bottom: 6px !important; }
          #printable-receipt .mb-6 { margin-bottom: 10px !important; }
          #printable-receipt td, #printable-receipt th { padding: 4px 0 !important; }
          
          /* Esconde o ícone de talher para economizar espaço e tinta na impressora */
          #printable-receipt .w-12 { display: none !important; }
        }
      `}} />
    </div>
  )
}