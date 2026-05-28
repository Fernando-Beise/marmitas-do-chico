'use client'

import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '../components/providers'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className="font-sans antialiased">
        {/* O Providers envelopando o children aqui no layout global garante um único carrinho pro site todo */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}