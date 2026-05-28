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
          {cart.map((item) => {
            // Puxa a fotoUrl direta do item (salva de forma plana no LocalStorage)
            const imagemPrato = item.fotoUrl || 'https://placehold.co/600x450?text=Marmita+do+Chico'
            
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={imagemPrato}
                      alt={item.nome}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground truncate">{item.nome}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{item.descricao}</p>
                    <p className="text-sm font-medium text-primary mt-1">
                      {formatCurrency(item.preco)}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
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
                      {/* Subtotal do Item específico */}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(item.preco * item.quantidade)}
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
            <Button className="w-full bg-primary py-6 text-lg text-primary-foreground hover:bg-primary/90 font-bold rounded-xl">
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