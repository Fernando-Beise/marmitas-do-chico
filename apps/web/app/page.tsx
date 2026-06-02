'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/storefront/header'
import { MealCard } from '@/components/storefront/meal-card'
import { FloatingCart } from '@/components/storefront/floating-cart'
import { api } from '@/services/api'
import { Plus, Minus, Info, Loader2, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'

// 1. IMPORTAÇÃO DO CARRINHO ATIVADA!
import { useCart } from '@/lib/cart-context' 

interface Adicional {
  id: string
  nome: string
  preco: number
  disponivel: boolean
}

interface Prato {
  id: string
  nome: string
  descricao: string
  preco: number
  fotoUrl: string | null
  disponivel: boolean
  adicionais?: Adicional[]
}

export default function HomePage() {

  const [lojaConfig, setLojaConfig] = useState({ aberta: false, mensagem: '' })
  const [isLoadingLoja, setIsLoadingLoja] = useState(true)

  useEffect(() => {
    const fetchStatusLoja = async () => {
      try {
        const res = await api.get('/loja/status')
        setLojaConfig(res.data)
      } catch (error) {
        console.error("Erro ao carregar status da loja:", error)
      } finally {
        setIsLoadingLoja(false)
      }
    }
    fetchStatusLoja()
  }, [])

  const [availableMeals, setAvailableMeals] = useState<Prato[]>([])
  const [loading, setLoading] = useState(true)
  
  // 2. FUNÇÃO DO CARRINHO ATIVADA!
  const { addItem } = useCart()

  // --- ESTADOS DO MODAL DE ADICIONAIS ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<Prato | null>(null)
  
  // Quantidade principal da marmita
  const [quantidade, setQuantidade] = useState(1)
  
  // Dicionário que guarda as quantidades de cada adicional pelo ID -> { "id-do-ovo": 2, "id-da-salada": 1 }
  const [adicionaisQuantidades, setAdicionaisQuantidades] = useState<Record<string, number>>({})

  useEffect(() => {
    async function loadMeals() {
      try {
        const response = await api.get('/pratos')
        const ativos = Array.isArray(response.data) 
          ? response.data.filter((meal: Prato) => meal && meal.disponivel === true)
          : []
        setAvailableMeals(ativos)
      } catch (error) {
        console.error('Erro ao buscar o cardápio do banco:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMeals()
  }, [])

  // --- FUNÇÕES DO MODAL ---
  const abrirModal = (meal: Prato) => {
    setSelectedMeal(meal)
    setQuantidade(1)
    setAdicionaisQuantidades({}) // Limpa as quantidades anteriores
    setIsModalOpen(true)
  }

  const fecharModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedMeal(null), 200)
  }

  // Função para aumentar ou diminuir a quantidade de um adicional específico
  const alterarQuantidadeAdicional = (adicionalId: string, delta: number) => {
    setAdicionaisQuantidades(prev => {
      const quantidadeAtual = prev[adicionalId] || 0
      const novaQuantidade = Math.max(0, quantidadeAtual + delta) // Impede que fique menor que 0
      
      const novoEstado = { ...prev }
      if (novaQuantidade === 0) {
        delete novoEstado[adicionalId] // Se chegar a 0, limpa do estado para não pesar
      } else {
        novoEstado[adicionalId] = novaQuantidade
      }
      return novoEstado
    })
  }

  const calcularTotal = () => {
    if (!selectedMeal) return 0
    
    const precoPrato = Number(selectedMeal.preco)
    
    // Soma o (preço do adicional * a sua quantidade selecionada)
    let precoAdicionaisTotal = 0
    selectedMeal.adicionais?.forEach(adic => {
      const qtdSelecionada = adicionaisQuantidades[adic.id] || 0
      precoAdicionaisTotal += Number(adic.preco) * qtdSelecionada
    })

    return precoPrato * quantidade + precoAdicionaisTotal
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
  }

  const handleAddToCart = () => {
    if (!selectedMeal) return

    // Filtramos apenas os que o cliente selecionou quantidade > 0
    const extrasSelecionados = selectedMeal.adicionais
      ?.filter(a => (adicionaisQuantidades[a.id] || 0) > 0)
      .map(a => ({
        adicionalId: a.id, // ID real do adicional no banco
        nome: a.nome,
        precoCobrado: Number(a.preco), // Travamos o preço no momento da compra
        quantidade: adicionaisQuantidades[a.id]
      })) || []

    // Montamos o "ItemPedido" temporário para o Carrinho
    const itemParaCarrinho = {
      id: crypto.randomUUID(), // Para não misturar marmitas iguais
      pratoId: selectedMeal.id, 
      nome: selectedMeal.nome,
      descricao: selectedMeal.descricao,
      precoUnitario: Number(selectedMeal.preco), 
      fotoUrl: selectedMeal.fotoUrl,
      quantidade: quantidade, 
      adicionaisEscolhidos: extrasSelecionados
    }

    // 3. ENVIO PARA O LOCALSTORAGE ATIVADO!
    addItem(itemParaCarrinho)
    
    fecharModal()
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <section className="mb-8">
          <h2>A loja fica aberta do meio dia (12:00) até as nove da manhã (09:00)</h2>
          {/* BANNER DINÂMICO DE ACORDO COM O STATUS DA LOJA */}
          {isLoadingLoja ? (
            <div className="mb-6 rounded-xl bg-muted p-6 animate-pulse h-28" />
          ) : (
            <div className={`mb-6 rounded-xl p-6 bg-gradient-to-r ${
              lojaConfig.aberta 
                ? 'from-primary/10 to-accent/10 p-6' 
                : 'from-destructive/10 to-red-500/10 border border-destructive/20'
            }`}>
              <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
                {lojaConfig.aberta ? 'Cardápio Aberto!' : 'Loja Fechada Temporariamente'}
              </h1>
              <p className={lojaConfig.aberta ? 'text-muted-foreground font-medium' : 'text-destructive font-medium'}>
                {lojaConfig.aberta 
                  ? lojaConfig.mensagem 
                  : 'No momento os pedidos estão pausados para produção e entrega das marmitas. Voltamos logo após o almoço!'}
              </p>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground animate-pulse">
                Carregando o cardápio do Chico...
              </p>
            </div>
          ) : !lojaConfig.aberta ? (

            // CENÁRIO 1: LOJA FECHADA
            <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
              <h3 className="text-lg font-semibold text-muted-foreground">Cardápio Oculto</h3>
              <p className="text-sm text-muted-foreground mt-1">
                O menu será liberado assim que iniciarmos um novo ciclo de pedidos.
              </p>
            </div>
          ) : !loading && availableMeals.length === 0 ? (

            <div className="py-12 text-center">
            <p className="text-lg text-muted-foreground">
              Nenhuma marmita disponível no momento. Volte mais tarde!
            </p>
          </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableMeals.map((meal) => (
                <div 
                  key={meal.id} 
                  onClick={() => abrirModal(meal)}
                  className="cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <MealCard meal={meal} />
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <FloatingCart 
      
      />

      {/* --- MODAL DE ADICIONAIS COM QUANTIFICADOR --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden bg-white gap-0 border-0 rounded-2xl">
          <DialogTitle className="sr-only">
            Adicionar {selectedMeal?.nome}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Escolha os acompanhamentos e a quantidade da sua marmita.
          </DialogDescription>
          
          {selectedMeal && (
            <>
              {/* Foto de Destaque no Modal */}
              <div className="h-56 w-full relative bg-gray-100">
                {selectedMeal.fotoUrl ? (
                  <img
                    src={selectedMeal.fotoUrl}
                    alt={selectedMeal.nome}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <span className="text-muted-foreground">Sem foto</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h2 className="text-2xl font-black line-clamp-1">{selectedMeal.nome}</h2>
                  <p className="text-white/90 text-sm line-clamp-2 mt-1 drop-shadow-md">
                    {selectedMeal.descricao}
                  </p>
                </div>
              </div>

              <div className="p-5 max-h-[50vh] overflow-y-auto">
                {/* Seção de Adicionais */}
                {selectedMeal.adicionais && selectedMeal.adicionais.filter(a => a.disponivel).length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between mb-4">
                      <h3 className="font-bold text-gray-900 text-lg">Personalize seu pedido</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded">Opcional</span>
                    </div>

                    <div className="space-y-3">
                      {selectedMeal.adicionais.filter(a => a.disponivel).map((adic) => {
                        const qtd = adicionaisQuantidades[adic.id] || 0
                        const isSelecionado = qtd > 0
                        const precoNum = Number(adic.preco)

                        return (
                          <div 
                            key={adic.id} 
                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                              isSelecionado ? 'border-orange-600 bg-orange-50' : 'border-gray-100 bg-white hover:border-orange-200'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className={`font-medium ${isSelecionado ? 'text-orange-900' : 'text-gray-700'}`}>
                                {adic.nome}
                              </span>
                              <span className={`text-sm font-bold ${isSelecionado ? 'text-orange-700' : 'text-gray-500'}`}>
                                {precoNum > 0 ? `+ ${formatCurrency(precoNum)}` : 'Grátis'}
                              </span>
                            </div>

                            {/* Quantificador Individual para o Adicional */}
                            <div className="flex items-center bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Impede borbulhamento
                                  alterarQuantidadeAdicional(adic.id, -1)
                                }}
                                disabled={qtd === 0}
                                className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                                  qtd > 0 ? 'text-orange-600 hover:bg-orange-100' : 'text-gray-300'
                                }`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-6 text-center font-bold text-gray-900 text-sm">
                                {qtd}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alterarQuantidadeAdicional(adic.id, 1)
                                }}
                                className="w-8 h-8 flex items-center justify-center text-orange-600 hover:bg-orange-100 rounded-md transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-gray-500">
                    <p>Este prato não possui acompanhamentos adicionais.</p>
                  </div>
                )}
              </div>

              {/* Rodapé Fixo com Quantidade Principal e Botão de Adicionar */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-10">
                <div className="flex items-center justify-between gap-4">
                  
                  {/* Controle de Quantidade da Marmita em si */}
                  <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                    <button 
                      onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                      disabled={quantidade <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-gray-900">{quantidade}</span>
                    <button 
                      onClick={() => setQuantidade(q => q + 1)}
                      className="w-10 h-10 flex items-center justify-center text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Botão Gigante de Confirmar */}
                  <Button 
                    onClick={handleAddToCart}
                    className="flex-1 h-14 bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-lg shadow-orange-600/30 flex justify-between items-center px-4"
                  >
                    <span className="font-bold text-base">Adicionar</span>
                    <span className="font-black text-lg">{formatCurrency(calcularTotal())}</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}