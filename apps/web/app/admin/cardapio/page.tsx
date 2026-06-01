'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Send, UtensilsCrossed, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { api } from '@/lib/axios'

export default function CardapioAdminPage() {
  const [meals, setMeals] = useState<any[]>([])
  const [adicionais, setAdicionais] = useState<any[]>([])
  
  const [activeTab, setActiveTab] = useState<'marmitas' | 'adicionais'>('marmitas')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAdicionalModalOpen, setIsAdicionalModalOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<any | null>(null)
  
  // NOVO: Estado para controlar qual adicional está sendo editado
  const [editingAdicional, setEditingAdicional] = useState<any | null>(null)
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    fotoUrl: '',
    disponivel: true,
    adicionaisIds: [] as string[]
  })

  const [adicionalFormData, setAdicionalFormData] = useState({
    nome: '',
    preco: '',
  })

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    try {
      const [pratosRes, adicionaisRes] = await Promise.all([
        api.get('/pratos?admin=true'),
        api.get('/adicionais')
      ])
      setMeals(pratosRes.data)
      setAdicionais(adicionaisRes.data)
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
    }
  }

  // --- LÓGICA DE MARMITAS ---
  const openCreateModal = () => {
    setEditingMeal(null)
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      fotoUrl: 'https://placehold.co/400x300/f5e6d3/8b4513?text=Marmita',
      disponivel: true,
      adicionaisIds: []
    })
    setIsModalOpen(true)
  }

  const handleToggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const novoStatus = !currentStatus
      await api.put(`/pratos/${id}`, { disponivel: novoStatus })
      setMeals(prev => prev.map(meal => 
        meal.id === id ? { ...meal, disponivel: novoStatus } : meal
      ))
    } catch (error) {
      console.error("Erro ao alterar disponibilidade:", error)
      alert("Erro ao mudar a disponibilidade do prato.")
    }
  }

  const handleSave = async () => {
    try {
      if (!formData.nome || !formData.preco) {
        alert("Nome e Preço são obrigatórios.")
        return
      }

      const payload = {
        ...formData,
        preco: parseFloat(formData.preco)
      }

      if (editingMeal) {
        await api.put(`/pratos/${editingMeal.id}`, payload)
      } else {
        await api.post('/pratos', payload)
      }
      
      setIsModalOpen(false)
      carregarDados()
    } catch (error) {
      console.error("Erro ao salvar prato:", error)
      alert("Erro ao salvar o prato.")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza absoluta que deseja excluir esta marmita?')) return
    try {
      await api.delete(`/pratos/${id}`)
      setMeals(prev => prev.filter(meal => meal.id !== id))
    } catch (error) {
      console.error("Erro ao excluir:", error)
      alert("Erro ao excluir. Pratos vinculados a pedidos antigos não podem ser apagados por segurança.")
    }
  }

  // --- LÓGICA DE ADICIONAIS ---
  
  // NOVO: Função para abrir o modal do adicional limpo ou preenchido para edição
  const openAdicionalModal = (adic: any | null = null) => {
    setEditingAdicional(adic)
    if (adic) {
      setAdicionalFormData({ nome: adic.nome, preco: adic.preco.toString() })
    } else {
      setAdicionalFormData({ nome: '', preco: '' })
    }
    setIsAdicionalModalOpen(true)
  }

  const handleSaveAdicional = async () => {
    try {
      if (!adicionalFormData.nome) return alert("O nome do adicional é obrigatório.")
      
      const payload = {
        nome: adicionalFormData.nome,
        preco: adicionalFormData.preco ? parseFloat(adicionalFormData.preco) : 0
      }

      // NOVO: Verifica se está editando ou criando
      if (editingAdicional) {
        await api.put(`/adicionais/${editingAdicional.id}`, payload)
      } else {
        await api.post('/adicionais', payload)
      }
      
      setIsAdicionalModalOpen(false)
      carregarDados()
    } catch (error) {
      console.error("Erro ao salvar adicional:", error)
      alert("Erro ao salvar.")
    }
  }

  // NOVO: Função de Exclusão Lógica do Adicional
  const handleDeleteAdicional = async (id: string) => {
    if (!confirm('Excluir este adicional? Ele será removido de todas as marmitas atuais, mas o histórico de pedidos será mantido.')) return
    try {
      await api.delete(`/adicionais/${id}`)
      setAdicionais(prev => prev.filter(a => a.id !== id))
      
      // Remove instantaneamente da visualização dos pratos sem precisar de F5
      setMeals(prevMeals => prevMeals.map(meal => ({
        ...meal,
        adicionais: meal.adicionais?.filter((a: any) => a.id !== id) || []
      })))
    } catch (error) {
      console.error("Erro ao excluir adicional:", error)
      alert("Erro ao excluir adicional.")
    }
  }

  // CORREÇÃO AQUI: Atualiza o estado aninhado dos pratos instantaneamente para evitar necessidade de F5
  const handleToggleAdicionalStatus = async (id: string, currentStatus: boolean) => {
    try {
      const novoStatus = !currentStatus
      await api.patch(`/adicionais/${id}/status`, { disponivel: novoStatus })
      
      // Atualiza a lista autônoma de adicionais
      setAdicionais(prev => prev.map(a => 
        a.id === id ? { ...a, disponivel: novoStatus } : a
      ))

      // Atualiza o estado interno de cada prato que contém esse adicional para recalcular a contagem na hora
      setMeals(prevMeals => prevMeals.map(meal => ({
        ...meal,
        adicionais: meal.adicionais?.map((a: any) => 
          a.id === id ? { ...a, disponivel: novoStatus } : a
        ) || []
      })))

    } catch (error) {
      console.error("Erro ao alterar disponibilidade do adicional:", error)
    }
  }

  return (
    <div className="space-y-6 p-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Cardápio</h2>
          <p className="text-gray-600">Gerencie as marmitas e os adicionais do seu negócio</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/whatsapp">
            <Button className="gap-2 bg-green-600 text-white hover:bg-green-700">
              <Send className="h-4 w-4" />
              Enviar para os contatos
            </Button>
          </Link>

          {activeTab === 'marmitas' ? (
            <Button 
              onClick={openCreateModal} 
              className="bg-orange-600 text-white hover:bg-orange-700 font-bold shadow-md px-4 py-2 transition-colors flex items-center gap-2"
            >
              <Plus className="h-5 w-5" /> 
              Nova Marmita
            </Button>
          ) : (
            <Button 
              onClick={() => openAdicionalModal()} // ALTERADO AQUI PARA ABRIR O MODAL LIMPO
              className="bg-gray-900 text-white hover:bg-gray-800 font-bold shadow-md px-4 py-2 transition-colors flex items-center gap-2"
            >
              <PlusCircle className="h-5 w-5" /> 
              Novo Adicional
            </Button>
          )}
        </div>
      </div>

      {/* ABAS */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('marmitas')} 
          className={`pb-3 text-sm font-bold transition-colors ${activeTab === 'marmitas' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <div className="flex items-center gap-2"><UtensilsCrossed className="w-4 h-4" /> Marmitas Principais</div>
        </button>
        <button 
          onClick={() => setActiveTab('adicionais')} 
          className={`pb-3 text-sm font-bold transition-colors ${activeTab === 'adicionais' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500 hover:text-gray-800'}`}
        >
          <div className="flex items-center gap-2"><PlusCircle className="w-4 h-4" /> Adicionais Extras</div>
        </button>
      </div>

      {/* CONTEÚDO: MARMITAS */}
      {activeTab === 'marmitas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meals.map((meal) => {
            const adicionaisAtivos = meal.adicionais?.filter((a: any) => a.disponivel)?.length || 0;

            return (
              <Card 
                key={meal.id} 
                className={`border border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden transition-all flex flex-col ${
                  !meal.disponivel ? "opacity-60 bg-gray-100 border-dashed border-gray-400" : ""
                }`}
              >
                <CardContent className="p-4 flex flex-col h-full space-y-4">
                  <div className="relative h-48 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50 shrink-0">
                    <img
                      src={meal.fotoUrl || 'https://placehold.co/400x300/f5e6d3/8b4513?text=Marmita'}
                      alt={meal.nome}
                      className="object-cover w-full h-full"
                    />
                  </div>

                  <div className="space-y-1 flex-grow">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-lg text-gray-900 line-clamp-1">
                        {meal.nome}
                      </h3>
                      <span className="font-extrabold text-orange-600 shrink-0 text-base">
                        R$ {Number(meal.preco).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 h-10">
                      {meal.descricao || "Sem descrição informada."}
                    </p>
                    
                    <div className="pt-1">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border inline-flex items-center ${
                        adicionaisAtivos > 0 
                          ? 'bg-orange-50 text-orange-700 border-orange-200' 
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {adicionaisAtivos} {adicionaisAtivos === 1 ? 'adicional disponível' : 'adicionais'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-auto">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                      <Switch
                        checked={meal.disponivel}
                        onCheckedChange={() => handleToggleAvailability(meal.id, meal.disponivel)}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
                      />
                      <span className={`text-xs font-bold ${meal.disponivel ? "text-green-700" : "text-gray-500"}`}>
                        {meal.disponivel ? "Ativo" : "Pausado"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-gray-300 text-gray-700 bg-white hover:bg-gray-100 font-medium shadow-sm transition-colors"
                        onClick={() => {
                          setEditingMeal(meal)
                          setFormData({
                            nome: meal.nome,
                            descricao: meal.descricao || '',
                            preco: meal.preco.toString(),
                            fotoUrl: meal.fotoUrl || '',
                            disponivel: meal.disponivel,
                            adicionaisIds: meal.adicionais ? meal.adicionais.map((a: any) => a.id) : []
                          })
                          setIsModalOpen(true)
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1 text-gray-600" />
                        Editar
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm transition-colors flex items-center gap-1"
                        onClick={() => handleDelete(meal.id)}
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CONTEÚDO: ADICIONAIS COM BOTÕES DE EDIÇÃO */}
      {activeTab === 'adicionais' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {adicionais.map(adic => (
            <div key={adic.id} className={`p-4 flex flex-col h-full bg-white shadow-sm border border-gray-200 rounded-xl transition-all ${!adic.disponivel ? "opacity-60 bg-gray-50" : ""}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bold text-gray-900">{adic.nome}</p>
                  <p className="text-orange-600 font-semibold text-sm">
                    {adic.preco > 0 ? `+ R$ ${Number(adic.preco).toFixed(2)}` : 'Grátis'}
                  </p>
                </div>
                <Switch
                  checked={adic.disponivel}
                  onCheckedChange={() => handleToggleAdicionalStatus(adic.id, adic.disponivel)}
                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
                />
              </div>

              {/* NOVOS BOTÕES DE AÇÃO DO ADICIONAL */}
              <div className="flex gap-2 mt-auto pt-4 border-t border-gray-100">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
                  onClick={() => openAdicionalModal(adic)}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Editar
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1 bg-red-600 hover:bg-red-700 font-medium flex items-center justify-center gap-1"
                  onClick={() => handleDeleteAdicional(adic.id)}
                >
                  <Trash2 className="h-4 w-4" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR MARMITA */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMeal ? 'Editar' : 'Nova'} Marmita</DialogTitle>
            <DialogDescription className="sr-only">Preencha os dados da marmita</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Marmita</label>
              <Input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="Ex: Feijoada Light" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição / Ingredientes</label>
              <Textarea value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} placeholder="Arroz integral, feijão preto, couve..." />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Preço (R$)</label>
              <Input type="number" step="0.01" value={formData.preco} onChange={e => setFormData({...formData, preco: e.target.value})} placeholder="22.90" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Link da Foto (URL)</label>
              <Input value={formData.fotoUrl} onChange={e => setFormData({...formData, fotoUrl: e.target.value})} placeholder="https://..." />
            </div>

            {/* CHECKBOXES DE ADICIONAIS NO MODAL */}
            {adicionais.length > 0 && (
              <div className="pt-2 border-t border-gray-200 mt-4">
                <label className="text-sm font-bold mb-3 block text-gray-900">Adicionais Permitidos:</label>
                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto p-1">
                  {adicionais.map((adic) => (
                    <label 
                      key={adic.id} 
                      className={`flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-200 transition-colors ${
                        !adic.disponivel ? "opacity-50 bg-red-50/30 text-gray-400" : ""
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-orange-600 rounded"
                        checked={formData.adicionaisIds.includes(adic.id)}
                        onChange={() => {
                          setFormData(prev => ({
                            ...prev,
                            adicionaisIds: prev.adicionaisIds.includes(adic.id)
                              ? prev.adicionaisIds.filter(id => id !== adic.id)
                              : [...prev.adicionaisIds, adic.id]
                          }))
                        }}
                      />
                      <span className="truncate font-medium flex-1">
                        {adic.nome}
                      </span>
                      {/* O seu badge Desabilitado preservado intacto */}
                      {!adic.disponivel && (
                        <span className="text-[10px] text-red-500 font-bold shrink-0 bg-red-100/80 px-1 rounded">
                          Desabilitado
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 bg-gray-50 mt-2">
              <span className="text-sm font-medium text-gray-700">Disponível para venda hoje</span>
              <Switch 
                checked={formData.disponivel} 
                onCheckedChange={(checked) => setFormData({ ...formData, disponivel: checked })} 
                className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-gray-300"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4 mt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              className="text-gray-700 border-gray-300 hover:bg-gray-100 font-medium"
            >
              Cancelar
            </Button>
            
            <Button 
              onClick={handleSave} 
              className="bg-orange-600 text-white hover:bg-orange-700 font-bold shadow-md px-6"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CRIAR / EDITAR ADICIONAL */}
      <Dialog open={isAdicionalModalOpen} onOpenChange={setIsAdicionalModalOpen}>
        <DialogContent>
          <DialogHeader>
            {/* Título dinâmico dependendo se está criando ou editando */}
            <DialogTitle>{editingAdicional ? 'Editar' : 'Novo'} Acompanhamento / Adicional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome do Adicional</label>
              <Input placeholder="Ex: Ovo Frito, Salada à parte..." value={adicionalFormData.nome} onChange={(e) => setAdicionalFormData({...adicionalFormData, nome: e.target.value})} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Custo Extra (R$)</label>
              <Input type="number" step="0.01" placeholder="Deixe 0 se for grátis" value={adicionalFormData.preco} onChange={(e) => setAdicionalFormData({...adicionalFormData, preco: e.target.value})} />
              <p className="text-xs text-gray-500 mt-1">Se não alterar o preço da marmita, digite 0.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdicionalModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAdicional} className="bg-gray-900 text-white hover:bg-gray-800">
              Salvar Adicional
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}