'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Search, Printer, Loader2, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { api } from '@/services/api' 

// Adicionei os campos extras que a etiqueta precisa (endereço, pagamento, etc)
type Pedido = {
  id: string
  total: number
  status: string
  criadoEm: string
  taxaEntrega?: number
  cliente: {
    nome: string
    telefone?: string
  }
  endereco: {
    enderecoCompleto: string
    complemento?: string | null
  } | null
  itens: {
    quantidade: number
    precoUnitario?: number
    prato: {
      nome: string
    }
  }[]
  pagamento: {
    metodo: string
    status: string
    idTransacaoMp: string
    pagoEm: string  | null
    } | null
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Pedido[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('today') 
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const response = await api.get('/pedidos')
        setOrders(response.data)
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPedidos()
  }, [])

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(value))
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pendente: 'Pendente',
      preparando: 'Preparando',
      saiu_entrega: 'Saiu para Entrega',
      entregue: 'Entregue',
      cancelado: 'Cancelado',
    }
    return labels[status.toLowerCase()] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: 'bg-yellow-100 text-yellow-800',
      preparando: 'bg-blue-100 text-blue-800',
      saiu_entrega: 'bg-indigo-100 text-indigo-800',
      entregue: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
    }
    return colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const filteredOrders = orders.filter((order) => {
    const nomeCliente = order.cliente?.nome || 'Sem Nome'
    const matchesSearch =
      order.id.toLowerCase().includes(search.toLowerCase()) ||
      nomeCliente.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus =
      statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase()
    
    let matchesDate = true
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.criadoEm)
      const today = new Date()
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      if (dateFilter === 'today') {
        matchesDate = isSameDay(orderDate, today)
      } else if (dateFilter === 'yesterday') {
        matchesDate = isSameDay(orderDate, yesterday)
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePrintLabels = () => {
    window.print()
  }

  return (
    <div className="space-y-6 print:space-y-0 print:m-0 print:p-0 print:bg-white w-full">
      
      {/* === ÁREA VISÍVEL NA TELA (ESCONDIDA NA IMPRESSÃO) === */}
      <div className="print:hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pedidos</h1>
            <p className="text-muted-foreground">
              Gerencie e acompanhe todos os pedidos
            </p>
          </div>
          
          <Button onClick={handlePrintLabels} className="gap-2 bg-primary">
            <Printer className="h-4 w-4" />
            Imprimir Etiquetas ({filteredOrders.length})
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col xl:flex-row xl:items-center gap-4 justify-between">
              <CardTitle>Lista de Pedidos</CardTitle>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cliente ou ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="preparando">Preparando</SelectItem>
                    <SelectItem value="saiu_entrega">Saiu para Entrega</SelectItem>
                    <SelectItem value="entregue">Entregue</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[150px]">
                    <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Apenas de Hoje</SelectItem>
                    <SelectItem value="yesterday">De Ontem</SelectItem>
                    <SelectItem value="all">Todas as Datas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground mt-2">Carregando pedidos...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhum pedido encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-xs">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {order.cliente?.nome || 'Sem Nome'}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {order.itens?.map((i) => (
                          <span key={i.prato.nome} className="inline-block bg-muted px-2 py-1 rounded-md mr-1 mb-1 font-medium">
                            {i.quantidade}x {i.prato?.nome}
                          </span>
                        ))}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(order.criadoEm)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/admin/pedidos/${order.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/nota/${order.id}`}>
                            <Button variant="ghost" size="icon">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* === ÁREA DE IMPRESSÃO (ESCONDIDA NA TELA, VISÍVEL NA FOLHA) === */}
      {/* Cria uma grade com 2 colunas para caber perfeitamente na folha A4 */}
      <div className="hidden print:grid print:grid-cols-2 print:gap-4 print:w-full">
        {filteredOrders.map((order) => {
          const taxa = Number(order.taxaEntrega) || 0;
          const subtotal = Number(order.total) - taxa;
          
          return (
            // break-inside-avoid impede que a etiqueta seja cortada no meio na virada da página
            <div key={order.id} className="border-2 border-black p-4 break-inside-avoid text-sm flex flex-col h-full bg-white text-black">
              
              {/* Cabeçalho da Etiqueta */}
              <div className="flex justify-between items-start border-b border-gray-400 pb-2 mb-2">
                <div>
                  <h3 className="font-bold text-lg leading-tight uppercase">Marmitas do Chico</h3>
                  <p className="text-xs text-gray-600">ID: #{order.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{new Date(order.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-xs">{new Date(order.criadoEm).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="mb-3">
                <p className="font-bold text-base">{order.cliente?.nome}</p>
                {order.cliente?.telefone && <p className="text-xs text-gray-700">Tel: {order.cliente.telefone}</p>}
                
                <div className="mt-1 p-1 bg-gray-100 border border-gray-300 rounded">
                    <p className="text-xs leading-tight">
                      {order.endereco?.enderecoCompleto}
                    </p>
                </div>
              </div>

              {/* Pratos (O mais importante ganha destaque) */}
              <div className="flex-grow">
                <p className="font-bold mb-1 border-b border-gray-200">PEDIDO:</p>
                <ul className="space-y-1 mb-2">
                  {order.itens?.map((i) => (
                    <li key={i.prato.nome} className="font-bold text-base leading-tight flex justify-between">
                      <span>{i.quantidade}x {i.prato.nome}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pagamento e Valores */}
              <div className="mt-auto pt-2 border-t border-gray-400">
                <div className="flex justify-between text-xs">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {taxa > 0 && (
                  <div className="flex justify-between text-xs">
                    <span>Taxa Entrega:</span>
                    <span>{formatCurrency(taxa)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base mt-1">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                
                <div className="mt-2 text-center border-2 border-dashed border-gray-400 p-1 rounded">
                  <p className="font-bold text-xs uppercase text-black">
                    Pagamento: {order.pagamento?.metodo} - {order.pagamento?.status.toUpperCase()}
                  </p>
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* Estilo embutido para limpar a folha A4 e arrumar a grade */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          /* Esconde a barra lateral, topo e afins */
          aside, nav, header { display: none !important; }
          body, html, main { 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important; 
          }
          /* Força as cores de bordas e fundos cinzas a aparecerem na impressora */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  )
}