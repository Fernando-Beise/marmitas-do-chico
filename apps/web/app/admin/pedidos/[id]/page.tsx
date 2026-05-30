'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, MapPin, User, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Importe sua API configurada
import { api } from '@/services/api' 

// Tipagem baseada no seu Prisma
type PedidoDetalhe = {
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
    enderecoCompleto: any
    rua: string
    numero: string
    bairro: string
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

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.id as string
  
  const [order, setOrder] = useState<PedidoDetalhe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Busca o pedido específico na API
  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const response = await api.get(`/pedidos/${orderId}`)
        setOrder(response.data)
        setSelectedStatus(response.data.status)
      } catch (error) {
        console.error('Erro ao buscar detalhes do pedido:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (orderId) {
      fetchPedido()
    }
  }, [orderId])

  // Função para salvar o novo status no banco de dados
  const handleUpdateStatus = async () => {
    try {
      setIsUpdating(true)
      await api.patch(`/pedidos/${orderId}/status`, { status: selectedStatus })
      // Atualiza o estado local para refletir a mudança
      setOrder((prev) => prev ? { ...prev, status: selectedStatus } : prev)
      alert('Status atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar o status do pedido.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Funções de formatação
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      preparando: 'Preparando',
      saiu_entrega: 'Saiu para Entrega',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
    }
    return labels[status?.toLowerCase()] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: 'bg-yellow-100 text-yellow-800',
      preparando: 'bg-blue-100 text-blue-800',
      saiu_entrega: 'bg-indigo-100 text-indigo-800',
      entregue: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
    }
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando detalhes do pedido...</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-lg text-muted-foreground">Pedido não encontrado</p>
        <Button variant="outline" onClick={() => router.back()} className="mt-4">
          Voltar
        </Button>
      </div>
    )
  }

  // Calcula o subtotal dos itens (Total - Taxa de Entrega)
  const taxaEntrega = Number(order.taxaEntrega) || 0
  const totalPedido = Number(order.total) || 0
  const subtotal = totalPedido - taxaEntrega

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Pedido #{order.id.substring(0, 8).toUpperCase()}
            </h1>
            <p className="text-muted-foreground">
              Realizado em {formatDate(order.criadoEm)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/whatsapp">
              <Button className="gap-2 bg-green-600 text-white hover:bg-green-700 print:hidden">
                <Printer className="h-4 w-4" />
                Enviar para os contatos
              </Button>
            </Link>
            
            <Link href={`/admin/nota/${order.id}`}>
              <Button variant="outline" className="gap-2">
                <Printer className="h-4 w-4" />
                Imprimir Nota
              </Button>
            </Link>
          </div>
        
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          {/* Cliente e Entrega */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Nome</dt>
                    <dd className="font-medium">{order.cliente?.nome || 'Sem Nome'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Telefone</dt>
                    <dd className="font-medium">{order.cliente?.telefone}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-md">
                  <div>
                    <dt className="text-muted-foreground">Endereço</dt>
                    <dd className="font-medium">
                      {order.endereco 
                        ? `${order.endereco.enderecoCompleto}`
                        : 'Retirada no local'
                      }
                      {order.endereco?.complemento && ` (${order.endereco.complemento})`}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* Itens do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle>Itens do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.itens.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-sm font-medium">
                        {item.quantidade}x
                      </div>
                      <span className="font-medium">{item.prato.nome}</span>
                    </div>
                    <span>{formatCurrency(Number(item.precoUnitario) * item.quantidade)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo e Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de Entrega</span>
                  <span>{formatCurrency(taxaEntrega)}</span>
                </div>
                <div className="flex justify-between font-medium text-lg pt-4 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(totalPedido)}</span>
                </div>
              </div>
              <div className="pt-4 border-t space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método de Pagamento</span>
                  <span className="font-medium uppercase">{order.pagamento.metodo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status do Pagamento</span>
                  <span className="font-medium uppercase">{order.pagamento.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Status do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status atual:</span>
                <Badge variant="secondary" className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
              </div>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Alterar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="preparando">Preparando</SelectItem>
                  <SelectItem value="saiu_entrega">Saiu para Entrega</SelectItem>
                  <SelectItem value="entregue">Entregue</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleUpdateStatus} 
                disabled={isUpdating || selectedStatus === order.status}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Atualizar Status
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}