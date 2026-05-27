'use client'

import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-context'

export function FloatingCart() {
  const { totalItems } = useCart()

  if (totalItems === 0) return null

  return (
    <Link href="/carrinho" className="fixed bottom-6 right-6 z-50">
      <Button
        size="lg"
        className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <ShoppingBag className="h-6 w-6" />
        {totalItems > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {totalItems}
          </span>
        )}
        <span className="sr-only">Ver carrinho ({totalItems} itens)</span>
      </Button>
    </Link>
  )
}
