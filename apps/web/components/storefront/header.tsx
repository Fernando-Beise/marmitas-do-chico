'use client'

import Link from 'next/link'
import { UtensilsCrossed, ShoppingCart } from 'lucide-react'
import { useCart } from '../../lib/cart-context'

export function Header() {
  // Puxa o valor oficial do contexto global (que já está sincronizado via eventos)
  const { totalItems } = useCart()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
            <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight text-foreground">
              Marmitas do Chico
            </span>
            <span className="text-xs text-muted-foreground">
              Comida caseira com amor
            </span>
          </div>
        </Link>

        <Link
          href="/carrinho"
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary transition-colors hover:bg-secondary/80"
        >
          <ShoppingCart className="h-5 w-5 text-secondary-foreground" />
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground animate-in fade-in">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
          <span className="sr-only">
            Carrinho ({totalItems} {totalItems === 1 ? 'item' : 'itens'})
          </span>
        </Link>
      </div>
    </header>
  )
}