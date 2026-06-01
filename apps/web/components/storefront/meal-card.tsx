'use client'

import Image from 'next/image'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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
  const imagemPrato = meal.fotoUrl || 'https://placehold.co/600x450?text=Marmita+do+Chico'

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg flex flex-col h-full">
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
      <CardContent className="p-4 flex flex-col flex-1">
        <h3 className="mb-1 font-semibold text-card-foreground">{meal.nome}</h3>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground flex-1">
          {meal.descricao}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(meal.preco)}
          </span>
          {/* Botão apenas visual. O clique é gerenciado pela página Home para abrir o Modal! */}
          <Button
            size="sm"
            className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90 pointer-events-none"
            type="button"
          >
            <Plus className="h-4 w-4" />
            Personalizar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}