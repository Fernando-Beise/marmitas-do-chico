'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/storefront/header'
import { MealCard } from '@/components/storefront/meal-card'
import { FloatingCart } from '@/components/storefront/floating-cart'
import { api } from '@/services/api'

interface Prato {
  id: string
  nome: string
  descricao: string
  preco: number
  fotoUrl: string | null
  disponivel: boolean
}

export default function HomePage() {
  const [availableMeals, setAvailableMeals] = useState<Prato[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMeals() {
      try {
        const response = await api.get('/pratos')
        
        // Valida se o prato existe e se é true
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <section className="mb-8">
          <div className="mb-6 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 p-6">
            <h1 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
              Cardápio de Hoje
            </h1>
            <p className="text-muted-foreground">
              Escolha sua marmita caseira feita com ingredientes frescos e muito carinho.
            </p>
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <p className="text-lg text-muted-foreground animate-pulse">
                Carregando o cardápio do Chico...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableMeals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </div>
          )}
        </section>

        {!loading && availableMeals.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-lg text-muted-foreground">
              Nenhuma marmita disponível no momento. Volte mais tarde!
            </p>
          </div>
        )}
      </main>

      <FloatingCart />
    </div>
  )
}