'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, Copy, QrCode } from 'lucide-react'
import { Header } from '@/components/storefront/header'
import { useCart } from '../../lib/cart-context'
import { api } from '../../services/api'

// Função utilitária para formatar o dinheiro
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
const formatarCPF = (value: string) => {
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após o terceiro dígito
    .replace(/(\d{3})(\d)/, '$1.$2') // Coloca ponto após o sexto dígito
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2') // Coloca hífen após o nono dígito
    .substring(0, 14) // Limita o tamanho máximo do CPF formatado
}

const formatarTelefone = (value: string) => {
  return value
    .replace(/\D/g, '') // Remove tudo o que não é dígito
    .replace(/(\d{2})(\d)/, '($1) $2') // Coloca parênteses no DDD
    .replace(/(\d{5})(\d)/, '$1-$2') // Coloca hífen no número celular (9 dígitos)
    .substring(0, 15) // Limita o tamanho: (XX) XXXXX-XXXX
}

export default function ConfirmacaoPage() {
  const { cart, totalPrice, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  
  // Estado para armazenar o retorno do Mercado Pago
  const [pixDados, setPixDados] = useState<{ qrCodeCopyPaste: string; qrCodeBase64: string } | null>(null)

  // Estados dos campos do formulário
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [rua, setRua] = useState('')
  const [numero, setNumero] = useState('')
  const [bairro, setBairro] = useState('')
  const [dadosEntrega, setDadosEntrega] = useState({
        nome: '',
        sobrenome: '',     
        email: '',         
        cpf: '',           
        telefone: '',
        rua: '',
        numero: '',
        bairro: ''
    })

  const handleFinalizarPedido = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (cart.length === 0) {
      alert('Seu carrinho está vazio!')
      return
    }

    setLoading(true)
    try {
      // Mude este bloco dentro da sua handleFinalizarPedido:
        const itensPedido = cart.map((item) => ({
            pratoId: item.id,
            quantidade: item.quantidade, 
            precoUnitario: item.preco
        }))

      // Faz a chamada para o backend criar o pedido e gerar o pagamento PIX
      const response = await api.post('/pedidos', {
        clienteId: "Ajustado pelo backend", 
        total: totalPrice,
        itens: itensPedido,
        // Enviando todos os dados juntos para o backend não quebrar!
        dadosEntrega: { 
          nome: nome,
          sobrenome: dadosEntrega.sobrenome,
          cpf: dadosEntrega.cpf,
          telefone: dadosEntrega.telefone,
          email: dadosEntrega.email,
          rua: rua,
          numero: numero,
          bairro: bairro
        } 
      })

      // Salva os dados do PIX e limpa a sacola de compras global
      setPixDados(response.data.pix)
      clearCart()
      
    } catch (error) {
      console.error('Erro ao processar pagamento PIX:', error)
      alert('Erro ao processar o pedido. Verifique se o seu Backend e o Mercado Pago estão rodando corretamente.')
    } finally {
      setLoading(false)
    }
  }

  
  // Se o Mercado Pago devolveu o PIX, nós substituímos o formulário por esta tela
  if (pixDados) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="container mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-lg animate-in fade-in zoom-in-95 duration-500">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Pedido Recebido!</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Pague via PIX para que o Chico comece a preparar sua marmita.
            </p>

            <div className="bg-white p-4 rounded-xl inline-block mb-6 border border-zinc-200">
              {pixDados.qrCodeBase64 ? (
                <Image 
                  src={`data:image/jpeg;base64,${pixDados.qrCodeBase64}`} 
                  alt="QR Code PIX" 
                  width={200}
                  height={200}
                  className="mx-auto"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-zinc-400">
                  <QrCode className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="mb-8">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pixDados.qrCodeCopyPaste)
                  alert('Código PIX copiado para a área de transferência!')
                }}
                className="w-full flex items-center justify-center gap-2 border border-input hover:bg-muted text-foreground py-3 px-4 rounded-xl font-medium transition-colors"
              >
                <Copy className="h-5 w-5" />
                Copiar Código PIX
              </button>
            </div>

            <Link href="/" className="block">
              <button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-4 rounded-xl text-lg transition-colors">
                Voltar para o Cardápio
              </button>
            </Link>
          </div>
        </main>
      </div>
    )
  }

  // FORMULÁRIO DE ENTREGA
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-md">
        <Link
          href="/carrinho"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao carrinho
        </Link>

        <h1 className="mb-6 text-2xl font-bold">Dados de Entrega</h1>

        <form onSubmit={handleFinalizarPedido} className="space-y-6">
            {/* Sessão: Contato */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider mb-2">
                Quem vai receber
                </h3>
                <div>
                <label className="text-sm font-semibold mb-1.5 block">Nome Completo</label>
                <input 
                    required 
                    type="text" 
                    value={nome} 
                    onChange={e => setNome(e.target.value)} 
                    className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                    placeholder="Ex: Fernando Silva" 
                />
                </div>
                <div>
                    <label className="block text-sm font-medium">Sobrenome</label>
                    <input
                        type="text"
                        required
                        className="w-full border rounded p-2"
                        value={dadosEntrega.sobrenome}
                        onChange={(e) => setDadosEntrega({ ...dadosEntrega, sobrenome: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">CPF (Obrigatório para o Pix)</label>
                    <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        className="w-full border rounded p-2 focus:ring-2 focus:ring-primary focus:outline-none"
                        value={dadosEntrega.cpf}
                        onChange={(e) => setDadosEntrega({ 
                        ...dadosEntrega, 
                        cpf: formatarCPF(e.target.value) 
                        })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Telefone / WhatsApp</label>
                    <input
                        type="text"
                        required
                        placeholder="(51) 99999-9999"
                        className="w-full border rounded p-2 focus:ring-2 focus:ring-primary focus:outline-none"
                        value={dadosEntrega.telefone}
                        onChange={(e) => setDadosEntrega({ 
                        ...dadosEntrega, 
                        telefone: formatarTelefone(e.target.value) 
                        })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">E-mail</label>
                    <input
                        type="email"
                        required
                        placeholder="seuemail@exemplo.com"
                        className="w-full border rounded p-2 focus:ring-2 focus:ring-primary focus:outline-none"
                        value={dadosEntrega.email}
                        onChange={(e) => setDadosEntrega({ 
                        ...dadosEntrega, 
                        email: e.target.value.trim().toLowerCase() 
                        })}
                    />
                </div>
            </div>

          {/* Sessão: Endereço */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider mb-2">
              Endereço
            </h3>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">Rua</label>
              <input 
                required 
                type="text" 
                value={rua} 
                onChange={e => setRua(e.target.value)} 
                className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                placeholder="Ex: Rua das Marmitas" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Número</label>
                <input 
                  required 
                  type="text" 
                  value={numero} 
                  onChange={e => setNumero(e.target.value)} 
                  className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  placeholder="Ex: 123" 
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Bairro</label>
                <input 
                  required 
                  type="text" 
                  value={bairro} 
                  onChange={e => setBairro(e.target.value)} 
                  className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all" 
                  placeholder="Ex: Centro" 
                />
              </div>
            </div>
          </div>

          {/* Rodapé Fixo de Pagamento */}
          <div className="pt-4">
            <div className="mb-4 p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
              <span className="font-medium text-foreground">Total a pagar:</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(totalPrice)}</span>
            </div>

            <button
              type="submit"
              disabled={loading} // Deixamos o botão habilitado para o clique, tratando validações direto no clique se necessário
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-4 rounded-xl text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-foreground border-t-transparent" />
              ) : (
                'Gerar QR Code PIX'
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}