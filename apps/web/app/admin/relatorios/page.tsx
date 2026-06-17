'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, TrendingUp, Package, DollarSign, Users, MapPin, CreditCard, CalendarDays, AlertCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts'
import { api } from '@/services/api'

// Tipagem com os campos necessários para as análises complexas
type Pedido = {
  id: string
  total: number
  status: string
  criadoEm: string
  atualizadoEm: string  
cliente: {
    nome: string
    telefone?: string
  }
  endereco?: {
    bairro?: string | null
  } | null
  itens: {
    quantidade: number
    prato: {
      nome: string
    }
  }[]
  pagamento?: {
   metodo: string
    }
}

// Paleta de Cores para os Gráficos
const COLORS = ['hsl(var(--primary))', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

export default function RelatoriosPage() {
  const [orders, setOrders] = useState<Pedido[]>([])
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

  // O "Cérebro" do Relatório: processa todos os dados de uma vez
  const stats = useMemo(() => {
    let faturamentoTotal = 0
    let pedidosValidos = 0
    let totalMarmitasVendidas = 0
    let pedidosPendentes = 0
    let pedidosEntregues = 0
    let pedidosCancelados = 0

    const mealCount: Record<string, number> = {}
    const monthlyRev: Record<string, number> = {}
    const paymentCount: Record<string, number> = {}
    const neighborhoodCount: Record<string, number> = {}
    const clientCount: Record<string, number> = {} // Para taxa de retenção
    const weekdayCount: Record<string, number> = {
      'Dom': 0, 'Seg': 0, 'Ter': 0, 'Qua': 0, 'Qui': 0, 'Sex': 0, 'Sáb': 0
    }

    // Preparar os últimos 6 meses para o gráfico financeiro
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const today = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthKey = `${monthNames[d.getMonth()]}/${d.getFullYear().toString().slice(-2)}`
      monthlyRev[monthKey] = 0
    }

    // Processamento de cada pedido
    orders.forEach((order) => {
      const isCancelled = order.status === 'cancelado'
      const date = new Date(order.atualizadoEm)

      // Contagem de Status Geral
      if (order.status === 'pendente' || order.status === 'preparando') pedidosPendentes++
      if (order.status === 'entregue') pedidosEntregues++
      if (isCancelled) pedidosCancelados++

      // Métricas de Vendas (Ignora Cancelados)
      if (!isCancelled) {
        faturamentoTotal += Number(order.total)
        pedidosValidos++

        // Dia da semana
        const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        weekdayCount[dias[date.getDay()]] += 1

        // Pagamento
        const pag = order.pagamento?.metodo?.replace('_', ' ') || 'Não inf.'
        paymentCount[pag] = (paymentCount[pag] || 0) + 1

        // Bairros
        if (order.endereco?.bairro) {
          const bairro = order.endereco.bairro
          neighborhoodCount[bairro] = (neighborhoodCount[bairro] || 0) + 1
        }

        // Retenção (Fidelidade do Cliente pelo Telefone ou Nome)
        const clienteId = order.cliente?.telefone || order.cliente?.nome || 'Desconhecido'
        clientCount[clienteId] = (clientCount[clienteId] || 0) + 1

        // Receita Mensal
        const monthKey = `${monthNames[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`
        if (monthlyRev[monthKey] !== undefined) {
          monthlyRev[monthKey] += Number(order.total)
        }

        // Quantidade total de marmitas e Top Pratos
        order.itens?.forEach((item) => {
          totalMarmitasVendidas += item.quantidade
          const nome = item.prato?.nome || 'Desconhecido'
          mealCount[nome] = (mealCount[nome] || 0) + item.quantidade
        })
      }
    })

    // Cálculos Finais e Formatação para os Gráficos
    const ticketMedio = pedidosValidos > 0 ? faturamentoTotal / pedidosValidos : 0

    // Calcula a Taxa de Fidelidade
    let novosClientes = 0
    let clientesRecorrentes = 0
    Object.values(clientCount).forEach(qtd => {
      if (qtd > 1) clientesRecorrentes++
      else novosClientes++
    })
    const totalClientes = novosClientes + clientesRecorrentes
    const taxaRetencao = totalClientes > 0 ? (clientesRecorrentes / totalClientes) * 100 : 0

    return {
      faturamentoTotal,
      pedidosValidos,
      totalMarmitasVendidas,
      ticketMedio,
      pedidosPendentes,
      pedidosEntregues,
      pedidosCancelados,
      taxaRetencao,
      clientesRecorrentes,
      topMealsData: Object.entries(mealCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5),
      monthlyRevenueData: Object.entries(monthlyRev).map(([month, revenue]) => ({ month, revenue })),
      weekdayData: Object.entries(weekdayCount).map(([dia, vendas]) => ({ dia, vendas })),
      paymentData: Object.entries(paymentCount).map(([name, value]) => ({ name: name.toUpperCase(), value })),
      topBairrosData: Object.entries(neighborhoodCount).map(([bairro, entregas]) => ({ bairro, entregas })).sort((a, b) => b.entregas - a.entregas).slice(0, 5),
    }
  }, [orders])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Calculando métricas avançadas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inteligência de Negócios</h1>
        <p className="text-muted-foreground">
          Relatórios estratégicos, logística e comportamento de vendas.
        </p>
      </div>

      {/* LINHA 1: KPIs PRINCIPAIS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.faturamentoTotal)}</div>
            <p className="text-xs text-muted-foreground mt-1">Livre de cancelamentos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Marmitas Vendidas</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMarmitasVendidas} <span className="text-sm font-normal text-muted-foreground">unidades</span></div>
            <p className="text-xs text-muted-foreground mt-1">Volume de produção da cozinha</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.ticketMedio)}</div>
            <p className="text-xs text-muted-foreground mt-1">Gasto médio por pedido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Fidelidade</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.taxaRetencao.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.clientesRecorrentes} clientes já compraram +de 1 vez</p>
          </CardContent>
        </Card>
      </div>

      {/* LINHA 2: GRÁFICOS FINANCEIROS E PRODUTOS */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Receita (Últimos 6 meses)</CardTitle>
            <CardDescription>Acompanhe o crescimento financeiro do restaurante</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} tickMargin={10} />
                  <YAxis tickFormatter={(value) => `R$ ${value}`} fontSize={12} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Receita']} 
                    labelStyle={{ color: 'black' }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} 
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Marmitas Mais Vendidas</CardTitle>
            <CardDescription>Para planejamento de compras e estoque</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {stats.topMealsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.topMealsData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {stats.topMealsData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip 
                        formatter={(value: any) => [value, 'Unidades Vendidas']}
                        labelStyle={{ color: 'black' }} 
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Sem dados suficientes</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LINHA 3: COMPORTAMENTO E LOGÍSTICA */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Gráfico de Dias de Pico */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5"/> Dias de Pico (Volume de Pedidos)</CardTitle>
            <CardDescription>Descubra os melhores dias para lançar promoções</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weekdayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" fontSize={12} tickMargin={10} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip 
                    formatter={(value: any) => [value, 'Pedidos Realizados']} 
                    labelStyle={{ color: 'black' }}
                    cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} 
                  />
                  <Bar dataKey="vendas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Métodos de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5"/> Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {stats.paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" labelLine={false}>
                      {stats.paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />)}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [value, 'Pedidos']}
                      labelStyle={{ color: 'black' }} 
                    />
                    {/* Legenda adicionada e alinhada ao fundo! */}
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm">Sem dados suficientes</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LINHA 4: TABELA DE BAIRROS & STATUS OPERACIONAL */}
      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Mapa de Calor / Top Bairros */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5"/> Logística: Concentração de Entregas</CardTitle>
            <CardDescription>Os 5 bairros onde você tem mais clientes ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topBairrosData.length > 0 ? stats.topBairrosData.map((bairro, index) => (
                <div key={bairro.bairro} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <span className="font-medium text-sm">{bairro.bairro}</span>
                  </div>
                  <span className="text-sm font-bold">{bairro.entregas} entregas</span>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">Ainda não há dados de endereço suficientes.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resumo de Status (Gargalos) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5"/> Status Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center rounded-lg bg-yellow-50 p-3">
                <span className="text-sm font-medium text-yellow-800">Em andamento</span>
                <span className="text-lg font-bold text-yellow-800">{stats.pedidosPendentes}</span>
              </div>
              <div className="flex justify-between items-center rounded-lg bg-green-50 p-3">
                <span className="text-sm font-medium text-green-800">Concluídos/Entregues</span>
                <span className="text-lg font-bold text-green-800">{stats.pedidosEntregues}</span>
              </div>
              <div className="flex justify-between items-center rounded-lg bg-red-50 p-3">
                <span className="text-sm font-medium text-red-800">Cancelados</span>
                <span className="text-lg font-bold text-red-800">{stats.pedidosCancelados}</span>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
