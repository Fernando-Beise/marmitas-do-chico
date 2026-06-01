'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Header } from '@/components/storefront/header'
import { useCart } from '../../lib/cart-context'
import { formatCurrency } from '@/components/storefront/meal-card'

function CarrinhoContent() {
  // Puxa o array 'cart', as funções de alteração e o preço total calculados pelo LocalStorage
  const { cart, updateQuantity, removeItem, totalPrice } = useCart()

  // Se o array de itens do LocalStorage estiver vazio
  if (!cart || cart.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2 text-foreground">Seu carrinho está vazio</h2>
            <p className="text-muted-foreground mb-6">Que tal dar uma olhada no cardápio de hoje?</p>
            <Link href="/">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Ver Cardápio
              </Button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold">Meu Carrinho</h1>
        </div>

        <div className="space-y-4">
          {cart.map((item: any) => {
            // Puxa a fotoUrl direta do item (salva de forma plana no LocalStorage)
            const imagemPrato = item.fotoUrl || 'https://placehold.co/600x450?text=Marmita+do+Chico'
            
            // CÁLCULO DINÂMICO DOS ADICIONAIS (Nomes de variáveis atualizados)
            const basePrice = Number(item.precoUnitario) || 0;
            const extrasTotal = item.adicionaisEscolhidos?.reduce((acc: number, adic: any) => {
              return acc + (Number(adic.precoCobrado) * Number(adic.quantidade));
            }, 0) || 0;
            
            // Subtotal daquela linha = (Prato + Valor dos Adicionais) * Quantidade de Marmitas
            const subtotalItem = (basePrice * item.quantidade) + extrasTotal;
            
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  
                  {/* Foto da Marmita */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg self-start sm:self-center">
                    <Image
                      src={imagemPrato}
                      alt={item.nome}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  
                  {/* Informações da Marmita e Adicionais */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground truncate">{item.nome}</h3>
                    <p className="text-sm font-medium text-primary mt-1">
                      {formatCurrency(basePrice)}
                    </p>
                    
                    
                    {/* LISTAGEM DOS ADICIONAIS */}
                    {item.adicionaisEscolhidos && item.adicionaisEscolhidos.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          Adicionais:
                        </p>
                        {item.adicionaisEscolhidos.map((adic: any, index: number) => (
                          <div key={index} className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              <span className="font-bold text-foreground/70 mr-1">{adic.quantidade}x</span> 
                              {adic.nome}
                            </span>
                            <span>
                              {adic.precoCobrado > 0 
                                ? `+ ${formatCurrency(adic.precoCobrado * adic.quantidade)}` 
                                : 'Grátis'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Controles de Quantidade e Subtotal */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-border sm:border-0">
                    
                    {/* Botões de + e - quantidade */}
                    <div className="flex items-center gap-2 border border-input rounded-lg p-1 bg-background">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantidade - 1)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantidade + 1)}
                        className="p-1 rounded hover:bg-muted text-muted-foreground"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Subtotal do Item específico COM OS ADICIONAIS EMBUTIDOS */}
                      <span className="font-semibold text-foreground text-lg">
                        {formatCurrency(subtotalItem)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remover item</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Card de Preço Total */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(totalPrice)}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          {/* Botão que leva para a página de dados de entrega e PIX */}
          <Link href="/confirmacao" className="block">
            <Button className="w-full bg-primary py-6 text-lg text-primary-foreground hover:bg-primary/90 font-bold rounded-xl shadow-lg">
              Confirmar Pedido
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

export default function CarrinhoPage() {
  return <CarrinhoContent />
}