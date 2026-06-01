'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

// 1. Atualizamos a tipagem para o formato que a Home envia
interface AdicionalEscolhido {
  adicionalId: string
  nome: string
  precoCobrado: number
  quantidade: number
}

interface CartItem {
  id: string              // O UUID único daquela linha no carrinho
  pratoId: string         // O ID real do banco
  nome: string
  descricao: string
  precoUnitario: number   // Novo nome do preço
  fotoUrl: string | null
  quantidade: number      // Quantidade de marmitas
  adicionaisEscolhidos: AdicionalEscolhido[]
  preco?: number          // Mantemos opcional para não quebrar legados
}

interface CartContextType {
  cart: CartItem[]
  addItem: (item: any) => void
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

  const addItem = (novoItem: any) => {
    // 2. A MÁGICA ESTÁ AQUI: Aceitamos tudo o que vem da Home perfeitamente
    const itemNormalizado: CartItem = {
      id: novoItem.id, // O UUID gerado na Home para não misturar marmitas
      pratoId: novoItem.pratoId || novoItem.id,
      nome: novoItem.nome || novoItem.name,
      descricao: novoItem.descricao || novoItem.description,
      precoUnitario: Number(novoItem.precoUnitario || novoItem.preco || novoItem.price || 0),
      fotoUrl: novoItem.fotoUrl || novoItem.image || null,
      quantidade: novoItem.quantidade || 1, // AGORA PEGA A QUANTIDADE DA HOME!
      adicionaisEscolhidos: novoItem.adicionaisEscolhidos || [], // AGORA GUARDA OS ADICIONAIS!
      preco: Number(novoItem.precoUnitario || novoItem.preco || 0)
    }

    const savedCart = localStorage.getItem('marmitas_chico_cart')
    let currentCart: CartItem[] = savedCart ? JSON.parse(savedCart) : []

    const existingIndex = currentCart.findIndex((item) => item.id === itemNormalizado.id)

    if (existingIndex > -1) {
      currentCart[existingIndex].quantidade += itemNormalizado.quantidade
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

  // Apenas a contagem de marmitas
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantidade, 0)
  
  // 3. CÁLCULO TOTAL CORRIGIDO: Soma o prato + os adicionais!
  const totalPriceCalculated = cart.reduce((sum, item) => {
    const basePrice = Number(item.precoUnitario || item.preco || 0);
    const listaAdicionais = Array.isArray(item.adicionaisEscolhidos) ? item.adicionaisEscolhidos : [];
    
    const extrasTotal = listaAdicionais.reduce((acc, adic) => {
        const precoAdic = Number(adic.precoCobrado) || 0;
        const qtdAdic = Number(adic.quantidade) || 1;
        return acc + (precoAdic * qtdAdic);
    }, 0);

    const valorTotalItem = (basePrice * item.quantidade) + extrasTotal;
    return sum + valorTotalItem;
  }, 0)

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