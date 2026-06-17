'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Eye, Search, Printer, Loader2, CalendarDays, CheckSquare } from 'lucide-react'
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

// Tipagem atualizada para receber os adicionais!
type Pedido = {
  id: string
  total: number
  status: string
  criadoEm: string
  atualizadoEm: string
  taxaEntrega?: number
  cliente: {
    nome: string
    telefone?: string
  }
  endereco: {
    cidade: string
    estado: string
    rua: string
    numero: string
    bairro: string
    complemento: string | null
  } | null
  itens: {
    quantidade: number
    precoUnitario?: number
    prato: {
      nome: string
    }
    // Nova caixinha para os adicionais
    adicionais?: {
      quantidade: number
      adicional?: {
        nome: string
      }
    }[]
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
  // Estados para controlar o Modal de Movimentação em Massa
  // Estados para controlar o Modal e a Seleção
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkDestStatus, setBulkDestStatus] = useState('')
  const [isBulkLoading, setIsBulkLoading] = useState(false)

  const fetchPedidos = async () => {
      try {
        setIsLoading(true) // Adicionado aqui para o loading aparecer na atualização também
        const response = await api.get('/pedidos')
        setOrders(response.data)
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error)
      } finally {
        setIsLoading(false)
      }
  }
  useEffect(() => {
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
      const orderDate = new Date(order.atualizadoEm)
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
    console.log("Iniciando impressão...");

    if (filteredOrders.length === 0) {
      alert('Não existem pedidos na tela para imprimir!');
      return;
    }

    // ✅ Pega o conteúdo da área de impressão
    const printContent = document.querySelector('.print-area')?.innerHTML;
    
    if (!printContent) {
      alert('Erro: Conteúdo de impressão não encontrado!');
      console.error('Elemento .print-area não existe no DOM');
      return;
    }

    // ✅ Cria um iframe temporário
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    
    if (!iframeDoc) {
      alert('Erro ao criar iframe de impressão');
      return;
    }

    // ✅ Escreve o conteúdo no iframe
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Impressão de Pedidos</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background: white;
          }
          
          .print-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            width: 100%;
          }
          
          .label {
            border: 2px solid black;
            padding: 16px;
            page-break-inside: avoid;
            break-inside: avoid;
            font-size: 12px;
            background: white;
            color: black;
          }
          
          .label h3 {
            font-weight: bold;
            font-size: 14px;
            margin: 0 0 4px 0;
          }
          
          .label p {
            margin: 2px 0;
            font-size: 11px;
          }
          
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    
    iframeDoc.close();

    // ✅ Aguarda o iframe carregar e depois imprime
    setTimeout(() => {
      iframe.contentWindow?.print();
      
      // Remove o iframe após imprimir
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  }


  // Seleciona ou remove todos os pedidos filtrados na tela
  const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedOrders(filteredOrders.map(order => order.id))
    } else {
      setSelectedOrders([])
    }
  }

  // Seleciona ou remove um pedido específico
  const handleToggleOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]                
    )
  }

  // Função do modal (agora usa a array selectedOrders)
  const handleConfirmarMovimentacao = async () => {
    if (!bulkDestStatus) {
      alert('Selecione um status de destino!');
      return;
    }

    setIsBulkLoading(true);

    try {
      await api.patch('/pedidos/bulk-status', {
        pedidoIds: selectedOrders,
        novoStatus: bulkDestStatus
      });

      alert(`${selectedOrders.length} pedidos alterados com sucesso!`);
      
      setIsBulkModalOpen(false);
      setSelectedOrders([]);
      setBulkDestStatus('');
      fetchPedidos(); 
      
    } catch (error) {
      console.error('Erro ao alterar pedidos:', error);
      alert('Ocorreu um erro ao atualizar os pedidos.');
    } finally {
      setIsBulkLoading(false);
    }
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
          
          <Button 
            className="gap-2 bg-primary"
            onClick={() => {
              if (filteredOrders.length === 0) {
                alert('Não existem pedidos na tela para imprimir!');
                return;
              }
              // O window.print() chama a tela de impressão do navegador nativamente
              handlePrintLabels();
            }} 
          >
            <Printer className="h-4 w-4" />
            {selectedOrders.length > 0 
              ? `Imprimir Selecionados (${selectedOrders.length})` 
              : `Imprimir Todos (${filteredOrders.length})`}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col xl:flex-row xl:items-start gap-4 justify-between">
              
              {/* TÍTULO E BOTÕES DE AÇÃO RÁPIDA */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <CardTitle>Lista de Pedidos</CardTitle>
                
                {/* BOTÃO MÁGICO SÓ FICA ATIVO SE ALGO ESTIVER SELECIONADO */}
                {/* BOTÃO AGORA AVISA SE VOCÊ ESQUECER DE MARCAR A CAIXINHA */}
                <Button 
                  size="sm" 
                  className="gap-2 bg-slate-800 hover:bg-slate-700 text-white"
                  onClick={() => {
                    if (selectedOrders.length === 0) {
                      alert('⚠️ Marque pelo menos um pedido nas caixinhas da tabela antes de alterar o status!');
                      return;
                    }
                    setIsBulkModalOpen(true);
                  }}
                >
                  <CheckSquare className="h-4 w-4" />
                  Alterar Status ({selectedOrders.length})
                </Button>
              </div>

              {/* FILTROS E PESQUISA */}
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
                <TableHead className="w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      onChange={handleToggleAll}
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                    />
                  </TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Itens e Personalizações</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagto.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    {/* Aumentei o colSpan para 8 por causa da nova coluna Pagto. */}
                    <TableCell colSpan={8} className="py-8 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground mt-2">Carregando pedidos...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhum pedido encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    // Alterar a abertura do TableRow para pintar a linha de cinza se estiver selecionada
                    <TableRow key={order.id} className={selectedOrders.includes(order.id) ? "bg-slate-50" : ""}>
                      
                      {/* CAIXINHA DE SELEÇÃO INDIVIDUAL */}
                      <TableCell>
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleToggleOrder(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-xs">
                        #{order.id.substring(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {order.cliente?.nome || 'Sem Nome'}
                      </TableCell>
                      
                      {/* === COLUNA DE ITENS E ADICIONAIS === */}
                      <TableCell className="max-w-[250px]">
                        {order.itens?.map((i, idx) => (
                          <div key={idx} className="mb-2 last:mb-0">
                            <span className="inline-block bg-muted px-2 py-1 rounded-md font-medium text-sm">
                              {i.quantidade}x {i.prato?.nome}
                            </span>
                            
                            {/* Renderiza os adicionais se existirem */}
                            {i.adicionais && i.adicionais.length > 0 && (
                              <div className="pl-2 mt-1 space-y-0.5">
                                {i.adicionais.map((a, aIdx) => (
                                  <p key={aIdx} className="text-xs text-muted-foreground">
                                    + {a.quantidade}x {a.adicional?.nome || 'Adicional Excluído'}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </TableCell>

                      <TableCell className="font-semibold">
                        {formatCurrency(order.total)}
                      </TableCell>
                      
                      {/* === NOVA COLUNA DE PAGAMENTO === */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs uppercase">{order.pagamento?.metodo || 'N/A'}</span>
                          <span className={`text-[10px] font-semibold uppercase ${order.pagamento?.status === 'aprovado' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {order.pagamento?.status || ''}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary" className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatDate(order.atualizadoEm)}
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

      {/* MODAL GERAL DE STATUS */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg border border-border">
            <h2 className="text-xl font-bold mb-2">Alterar Status dos Pedidos</h2>
            
            <p className="text-sm text-muted-foreground mb-6">
              Você selecionou <strong>{selectedOrders.length}</strong> pedido(s). 
              Escolha abaixo o novo status que deseja aplicar a todos eles.
            </p>

            <div className="space-y-4">
              <label className="text-sm font-medium">Novo Status:</label>
              
              <select 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={bulkDestStatus}
                onChange={(e) => setBulkDestStatus(e.target.value)}
                disabled={isBulkLoading}
              >
                <option value="" disabled>Selecione...</option>
                <option value="pendente">Pendente</option>
                <option value="preparando">Preparando</option>
                <option value="saiu_entrega">Saiu para Entrega</option>
                <option value="entregue">Entregue</option>
              </select>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsBulkModalOpen(false)}
                disabled={isBulkLoading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmarMovimentacao}
                disabled={isBulkLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isBulkLoading ? 'A Mudar...' : 'Confirmar e Notificar'}
              </Button>
            </div>
          </div>
        </div>
      )}

          
      {/* === ÁREA DE IMPRESSÃO (ESCONDIDA NA TELA, VISÍVEL NA FOLHA) === */}
      {/* === ÁREA DE IMPRESSÃO === */}
    <div className="print-area hidden">
  <div className="print-grid">
    {(selectedOrders.length > 0 
      ? filteredOrders.filter(order => selectedOrders.includes(order.id))
      : filteredOrders
    ).map((order) => {
      const taxa = Number(order.taxaEntrega) || 0;
      const subtotal = Number(order.total) - taxa;
      
      return (
        <div key={order.id} className="label">
              
              {/* Cabeçalho da Etiqueta */}
              <div className="flex justify-between items-start border-b border-gray-400 pb-2 mb-2">
                <div>
                  <h3 className="font-bold text-lg leading-tight uppercase">Chico Pratos Especiais</h3>
                  <p className="text-xs text-gray-600">ID: #{order.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">
			Pedido Feito: {new Date(order.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
		  	{new Date(order.criadoEm).toLocaleDateString('pt-BR')}
		  </p>
                  <p className="text-xs">
		  	Pedido concluido: {new Date(order.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {new Date(order.atualizadoEm).toLocaleDateString('pt-BR')}
		  </p>
                </div>
              </div>

              {/* Informações do Cliente */}
              <div className="mb-3">
                <p className="font-bold text-base">{order.cliente?.nome || 'Cliente não identificado'}</p>
                {order.cliente?.telefone && <p className="text-xs text-gray-700">Tel: {order.cliente.telefone}</p>}
                
                <div className="mt-1 p-1 bg-gray-100 border border-gray-300 rounded">
                    <p className="text-xs leading-tight">
                      {order.endereco?.cidade} - {order.endereco?.estado} <br />
                      {order.endereco?.rua}, {order.endereco?.numero} - {order.endereco?.bairro}
                      {order.endereco?.complemento && ` (${order.endereco.complemento})`}
                    </p>
                </div>
              </div>

              {/* Pratos e Adicionais (Impressão) */}
              <div className="flex-grow">
                <p className="font-bold mb-1 border-b border-gray-200">PEDIDO:</p>
                <ul className="space-y-2 mb-2">
                  {order.itens?.map((i, idx) => (
                    <li key={idx} className="flex flex-col">
                      <div className="font-bold text-base leading-tight flex justify-between">
                        {/* CORREÇÃO 1: i.prato?.nome blindado com ? */}
                        <span>{i.quantidade}x {i.prato?.nome || 'Prato Removido'}</span>
                      </div>
                      
                      {/* Lista de adicionais na etiqueta */}
                      {i.adicionais && i.adicionais.length > 0 && (
                        <div className="pl-3 mt-0.5 text-xs font-semibold text-gray-700">
                          {i.adicionais.map((a, aIdx) => (
                            <div key={aIdx}>+ {a.quantidade}x {a.adicional?.nome || 'Adicional Removido'}</div>
                          ))}
                        </div>
                      )}
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
                    {/* CORREÇÃO 2: Pagamento blindado com ? em todos os níveis */}
                    Pagamento: {order.pagamento?.metodo || 'N/A'} - {order.pagamento?.status?.toUpperCase() || 'AGUARDANDO'}
                  </p>
                </div>
              </div>

            </div>
          )
        }) }
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          /* Esconde elementos na tela, mostra na impressão */
          .print\\:grid {
            display: grid !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          /* Mostra o grid de impressão */
          body > div:last-child {
            display: grid !important;
          }
          
          aside, nav, header, .print\\:hidden { 
            display: none !important; 
          }
          
          body, html, main { 
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: white !important; 
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
    </div>
  )
}
