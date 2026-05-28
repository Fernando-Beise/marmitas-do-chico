'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface Prato {
  id: string
  nome: string
  descricao: string
  preco: number
  fotoUrl: string | null
  disponivel: boolean
}

interface CartItem extends Prato {
  quantidade: number
}

interface CartContextType {
  cart: CartItem[]
  addItem: (prato: any) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantidade: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)


  const sincronizarCarrinho = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('marmitas_chico_cart')
      if (saved) {
        setCart(JSON.parse(saved))
      } else {
        setCart([])
      }
    }
  }

  useEffect(() => {
    sincronizarCarrinho()
    setMounted(true)

    window.addEventListener('carrinho-atualizado', sincronizarCarrinho)
    window.addEventListener('storage', sincronizarCarrinho) // Funciona até entre abas diferentes

    return () => {
      window.removeEventListener('carrinho-atualizado', sincronizarCarrinho)
      window.removeEventListener('storage', sincronizarCarrinho)
    }
  }, [])

  const addItem = (prato: any) => {
    const itemNormalizado: CartItem = {
      id: prato.id,
      nome: prato.nome || prato.name,
      descricao: prato.descricao || prato.description,
      preco: Number(prato.preco || prato.price || 0),
      fotoUrl: prato.fotoUrl || prato.image || null,
      disponivel: prato.disponivel !== undefined ? prato.disponivel : true,
      quantidade: 1
    }

    const savedCart = localStorage.getItem('marmitas_chico_cart')
    let currentCart: CartItem[] = savedCart ? JSON.parse(savedCart) : []

    const existingIndex = currentCart.findIndex((item) => item.id === itemNormalizado.id)

    if (existingIndex > -1) {
      currentCart[existingIndex].quantidade += 1
    } else {
      currentCart.push(itemNormalizado)
    }

    localStorage.setItem('marmitas_chico_cart', JSON.stringify(currentCart))
    window.dispatchEvent(new Event('carrinho-atualizado'))
  }

  const removeItem = (id: string) => {
    const savedCart = localStorage.getItem('marmitas_chico_cart')
    let currentCart: CartItem[] = savedCart ? JSON.parse(savedCart) : []
    const newCart = currentCart.filter((item) => item.id !== id)
    
    localStorage.setItem('marmitas_chico_cart', JSON.stringify(newCart))
    window.dispatchEvent(new Event('carrinho-atualizado'))
  }

  const updateQuantity = (id: string, quantidade: number) => {
    if (quantidade <= 0) {
      removeItem(id)
      return
    }
    const savedCart = localStorage.getItem('marmitas_chico_cart')
    let currentCart: CartItem[] = savedCart ? JSON.parse(savedCart) : []
    const newCart = currentCart.map((item) =>
      item.id === id ? { ...item, quantidade } : item
    )
    
    localStorage.setItem('marmitas_chico_cart', JSON.stringify(newCart))
    window.dispatchEvent(new Event('carrinho-atualizado'))
  }

  const clearCart = () => {
    localStorage.removeItem('marmitas_chico_cart')
    window.dispatchEvent(new Event('carrinho-atualizado'))
  }

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantidade, 0)
  const totalPriceCalculated = cart.reduce((sum, item) => sum + item.preco * item.quantidade, 0)

  return (
    <CartContext.Provider
      value={{
        cart: mounted ? cart : [],
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems: mounted ? totalItemsCount : 0,
        totalPrice: mounted ? totalPriceCalculated : 0,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart deve ser usado dentro de um CartProvider')
  }
  return context
}