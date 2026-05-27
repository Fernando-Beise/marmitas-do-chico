'use client'

import { ReactNode } from 'react'
import { CartProvider } from '@/lib/cart-context'

export function Providers({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>
}
