'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, DollarSign, Clock, CheckCircle2, Eye } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/axios'
import { Switch } from '@/components/ui/switch'

export default function AdminDashboardPage() {

  const [lojaAberta, setLojaAberta] = useState(false)
  const [mensagemLoja, setMensagemLoja] = useState('')
  const [isLoadingLoja, setIsLoadingLoja] = useState(true)

  // Busca o status atual quando o Admin entra no painel
  useEffect(() => {
    const fetchStatusLoja = async () => {
      try {
        const res = await api.get('/loja/status')
        setLojaAberta(res.data.aberta)
        setMensagemLoja(res.data.mensagem)
      } catch (error) {
        console.error("Erro ao carregar status da loja:", error)
      } finally {
        setIsLoadingLoja(false)
      }
    }
    fetchStatusLoja()
  }, [])

  // Função que roda quando o Chico clica no Slider
  const handleToggleLoja = async (novoStatus: boolean) => {
    setLojaAberta(novoStatus) // Atualiza visualmente na hora
    try {
      await api.patch('/loja/status', { aberta: novoStatus })
      // Recarrega a mensagem calculada do servidor
      const res = await api.get('/loja/status')
      setMensagemLoja(res.data.mensagem)
    } catch (error) {
      alert("Erro ao atualizar o status da loja.")
      setLojaAberta(!novoStatus) // Reverte se der erro
    }
  }

  const [orders, setOrders] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalOrdersToday: 0,
    revenueToday: 0,
    pendingOrders: 0,
    deliveredMeals: 0
  })

  useEffect(() => {
    async function loadData() {
      try {
        const { data } = await api.get('/pedidos')
        setOrders(data)

        // Lógica de processamento dos dados reais do banco
        const pendentes = data.filter((o: any) => o.status === 'PENDENTE').length
        const total = data.reduce((acc: number, curr: any) => acc + Number(curr.total), 0)
        
        setStats({
          totalOrdersToday: data.length,
          revenueToday: total,
          pendingOrders: pendentes,
          deliveredMeals: data.filter((o: any) => o.status === 'ENTREGUE').length
        })
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard:", err)
      }
    }
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio hoje</p>
      </div>
      <Card className={`border-2 ${lojaAberta ? 'border-green-500 bg-green-50/50' : 'border-red-500 bg-red-50/50'}`}>
        <CardContent className="flex items-center justify-between p-6">
          <div className="space-y-1">
            <h3 className="font-bold text-lg">
              Status da Loja: {lojaAberta ? 'ABERTA PARA PEDIDOS' : 'FECHADA (COZINHANDO/ENTREGANDO)'}
            </h3>
            {lojaAberta ? (
              <p className="text-sm text-green-700 font-medium">
                {mensagemLoja}
              </p>
            ) : (
              <p className="text-sm text-red-600">
                Os clientes não conseguem fazer pedidos no momento.
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Switch 
              checked={lojaAberta}
              onCheckedChange={handleToggleLoja}
              disabled={isLoadingLoja}
            />
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pedidos Hoje</p>
              <p className="text-2xl font-bold">{stats.totalOrdersToday}</p>
            </div>
          </CardContent>
        </Card>
        {/* Adiciona os outros cards seguindo este padrão: */}
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <DollarSign className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receita Hoje</p>
              <p className="text-2xl font-bold">R$ {stats.revenueToday.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pedidos Recentes</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/pedidos">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <Badge variant="secondary">{order.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">R$ {Number(order.total).toFixed(2)}</span>
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/pedidos/${order.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}