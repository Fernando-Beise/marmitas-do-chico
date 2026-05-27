'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMeal, setEditingMeal] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco: '',
    fotoUrl: '',
    disponivel: true,
  })

  // Carrega os pratos ao entrar na página
  useEffect(() => {
    carregarPratos()
  }, [])

  async function carregarPratos() {
    try {
      const response = await api.get('/pratos')
      setMeals(response.data)
    } catch (error) {
      console.error("Erro ao buscar pratos:", error)
    }
  }

  // Função para abrir o modal de criação limpo
  const openCreateModal = () => {
    setEditingMeal(null)
    setFormData({
      nome: '',
      descricao: '',
      preco: '',
      fotoUrl: 'https://placehold.co/400x300/f5e6d3/8b4513?text=Marmita',
      disponivel: true,
    })
    setIsModalOpen(true)
  }

  // Altera a ativação/disponibilidade direto no card
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

  // Salva (Criação ou Edição)
  const handleSave = async () => {
    try {
      if (!formData.nome || !formData.preco) {
        alert("Nome e Preço são obrigatórios.")
        return
      }

      if (editingMeal) {
        await api.put(`/pratos/${editingMeal.id}`, formData)
      } else {
        await api.post('/pratos', formData)
      }
      
      setIsModalOpen(false)
      carregarPratos()
    } catch (error) {
      console.error("Erro ao salvar prato:", error)
      alert("Erro ao salvar o prato.")
    }
  }

  // Exclui a marmita do banco Neon
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Cardápio</h2>
          <p className="text-gray-600">Gerencie as marmitas disponíveis para venda</p>
        </div>
        
        {/* Botão com Cor Sólida Laranja (Garantido de aparecer) */}
        <Button 
          onClick={openCreateModal} 
          className="bg-orange-600 text-white hover:bg-orange-700 font-bold shadow-md px-4 py-2 transition-colors flex items-center gap-2"
        >
          <Plus className="h-5 w-5" /> 
          Nova Marmita
        </Button>
      </div>

      {/* Grid de Pratos Atualizado e Visível 🚀 */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {meals.map((meal) => (
    <Card 
      key={meal.id} 
      className={`border border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden transition-all ${
        !meal.disponivel ? "opacity-60 bg-gray-100 border-dashed border-gray-400" : ""
      }`}
    >
      <CardContent className="p-4 space-y-4">
        {/* Box da Imagem com borda visível */}
        <div className="relative h-48 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <img
            src={meal.fotoUrl || 'https://placehold.co/400x300/f5e6d3/8b4513?text=Marmita'}
            alt={meal.nome}
            className="object-cover w-full h-full"
          />
        </div>

        {/* Informações com Texto Escuro Garantido */}
        <div className="space-y-1">
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
        </div>

        {/* Controles de Ação com Cores Sólidas e Visíveis */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 mt-2">
          {/* Switch de Ativo / Inativo */}
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

          {/* Botões com Contraste Total */}
          <div className="flex gap-2">
            {/* Botão Editar - Cinza Escuro com Texto Branco */}
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
                })
                setIsModalOpen(true)
              }}
            >
              <Pencil className="h-4 w-4 mr-1 text-gray-600" />
              Editar
            </Button>
            
            {/* Botão Excluir - Vermelho Sólido com Ícone Branco */}
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
  ))}
</div>

      {/* Modal Criar / Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
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

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm font-medium">Disponível para venda hoje</span>
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
            
            {/* Botão de Salvar Laranja e Visível */}
            <Button 
              onClick={handleSave} 
              className="bg-orange-600 text-white hover:bg-orange-700 font-bold shadow-md px-6"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}