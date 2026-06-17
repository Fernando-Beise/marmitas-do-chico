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
  const [pausaAutomatica, setPausaAutomatica] = useState(false);

  // Busca o status atual quando o Admin entra no painel
  useEffect(() => {
   const fetchStatusLoja = async () => {
      try {
        const res = await api.get('/loja/status')
        setLojaAberta(res.data.statusNoBanco)
        setMensagemLoja(res.data.mensagem)
      } catch (error) {
        console.error("Erro ao carregar status da loja:", error)
      } finally {
        setIsLoadingLoja(false)
      }
    }
    fetchStatusLoja()


   const verificarPausaDoAlmoco = () => {
      const agora = new Date();
      const tempoEmMinutos = (agora.getHours() * 60) + agora.getMinutes();

      const inicioFechamento = Number(process.env.NEXT_HORARIO_PAUSA_INICIO) || 690;
      const fimFechamento = Number(process.env.NEXT_HORARIO_PAUSA_FIM) || 810;

      if (tempoEmMinutos >= inicioFechamento && tempoEmMinutos < fimFechamento) {
        setPausaAutomatica(true);
      } else {
        setPausaAutomatica(false);
      }
    };

    // Roda a verificação assim que ele abre o painel
    verificarPausaDoAlmoco();

    // Deixa um reloginho rodando a cada 1 minuto (60000ms)
    // Assim, se ele deixar o notebook aberto, o aviso aparece/some sozinho na hora exata!
    const intervalo = setInterval(verificarPausaDoAlmoco, 60000);
    return () => clearInterval(intervalo);
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
	const hoje = new Date();

	const pedidosValidosHoje = data.filter((o: any) => {
	   if (o.status?.tuUpperCase() === 'CANCELADO') return false;

	   if (o.atualizadoEm){
		const dataPedido = new Date(o.atualizadoEm);

		return (
		    dataPedido.getDate() === hoje.getDate() &&
		    dataPedido.getMonth() === hoje.getMonth() &&
	            dataPedido.getFullYear() === hoje.getFullYear()
		);
	   }
	   return true;
	});
        setOrders(pedidosValidosHoje);

        // Lógica de processamento dos dados reais do banco
        const pendentes = pedidosValidosHoje.filter((o: any) => o.status?.toUpperCase() === 'PENDENTE').length;
        const entregues = pedidosValidosHoje.filter((o: any) => o.status?.toUpperCase() === 'ENTREGUE').length;
        const total = pedidosValidosHoje.reduce((acc: number, curr: any) => acc + Number(curr.total), 0);
        
        setStats({
          totalOrdersToday: pedidosValidosHoje.length,
          revenueToday: total,
          pendingOrders: pendentes,
          deliveredMeals: entregues
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

      {/* NOVO: O Banner Laranja que só aparece se o botão estiver ligado E for hora do rush */}
      {lojaAberta && pausaAutomatica && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-800 p-4 rounded-md shadow-sm">
           <div className="flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="font-bold">Pausa Automática Ativa (Horário de Pico)</p>
           </div>
           <p className="mt-1 text-sm">
              O seu botão principal está <strong>LIGADO</strong>, mas o site está bloqueando novos pedidos temporariamente devido ao horário de pico (11:30 às 13:30). Às 13:30, o site voltará a aceitar pedidos automaticamente.
           </p>
        </div>
      )}

      <Card className={`border-2 ${!lojaAberta ? 'border-red-500 bg-red-50/50' : pausaAutomatica ? 'border-orange-500 bg-orange-50/50' : 'border-green-500 bg-green-50/50'}`}>
        
	<CardContent className="flex items-center justify-between p-6">

          <div className="space-y-1">

            <h3 className="font-bold text-lg">
              Status da Loja: {!lojaAberta ? 'FECHADA (COZINHANDO/ENTREGANDO)' : pausaAutomatica ? 'PAUSADA PARA O ALMOÇO' : 'ABERTA PARA PEDIDOS'}
            </h3>

            {!lojaAberta ? (
              <p className="text-sm text-red-700">
                Os clientes não conseguem fazer pedidos no momento.
              </p>
            ) : pausaAutomatica ? (
	      <p className="text-sm text-orange-700 font-medium">
                 A loja será aberta às 13:30
              </p>

	    ) : (
              <p className="text-sm text-green-700 font-medium">
                {mensagemLoja}
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
                      <Link href={'/admin/pedidos/'+order.id}><Eye className="h-4 w-4" /></Link>
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
