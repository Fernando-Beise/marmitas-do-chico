'use client'

import Image from 'next/image'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCart } from '../../lib/cart-context' // <-- Mudamos para caminho relativo para não ter erro de pasta!

interface Prato {
  id: string
  nome: string
  descricao: string
  preco: number
  fotoUrl: string | null
  disponivel: boolean
}

interface MealCardProps {
  meal: Prato
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function MealCard({ meal }: MealCardProps) {
  const cartContext = useCart()
  
  // Pegamos a função de forma ultra segura contra "is not a function"
  const addItem = cartContext?.addItem

  const imagemPrato = meal.fotoUrl || 'https://placehold.co/600x450?text=Marmita+do+Chico'

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={imagemPrato}
          alt={meal.nome}
          fill
          className="object-cover transition-transform hover:scale-105"
          crossOrigin="anonymous"
          unoptimized
        />
      </div>
      <CardContent className="p-4">
        <h3 className="mb-1 font-semibold text-card-foreground">{meal.nome}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
          {meal.descricao}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(meal.preco)}
          </span>
          <Button
            size="sm"
            onClick={() => {
              if (typeof addItem === 'function') {
                addItem(meal)
              } else {
                console.error('Contexto do carrinho não carregou corretamente no componente!', cartContext)
              }
            }}
            className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}