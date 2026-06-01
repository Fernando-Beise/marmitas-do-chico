'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, Copy, QrCode } from 'lucide-react'
import { Header } from '@/components/storefront/header'
import { useCart } from '../../lib/cart-context'
import { api } from '../../services/api'

// Importações do Mercado Pago (Checkout Transparente)
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'

// INICIALIZA O MERCADO PAGO (Coloque sua Public Key de teste ou produção aqui)
initMercadoPago('APP_USR-d5a85935-afec-452c-99ae-9f9846e72430', { locale: 'pt-BR' });

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
  const [step, setStep] = useState<1 | 2>(1) // Controla se estamos no formulário (1) ou no pagamento (2)
  
  // Estado unificado para armazenar o retorno do Mercado Pago (PIX ou Cartão)
  const [resultadoPagamento, setResultadoPagamento] = useState<any>(null)

  // Estados dos campos do formulário (Mantidos exatamente iguais)
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

  // Avança para a tela do Cartão de Crédito/PIX
  const handleIrParaPagamento = (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) {
      alert('Seu carrinho está vazio!')
      return
    }
    setStep(2)
  }

  // Acionado pelo botão interno do Mercado Pago
  const handleFinalizarPedido = async (paymentFormData: any) => {
    setLoading(true)
    try {
      const itensPedido = cart.map((item: any) => ({
          pratoId: item.pratoId || item.id,
          quantidade: item.quantidade, 
          precoUnitario: item.precoUnitario || item.preco,
          adicionaisEscolhidos: item.adicionaisEscolhidos || []
      }))

      const response = await api.post('/pedidos', {
        clienteId: "Ajustado pelo backend", 
        total: totalPrice,
        itens: itensPedido,
        // Exatamente a sua estrutura mantida intacta
        dadosEntrega: { 
          nome: nome,
          sobrenome: dadosEntrega.sobrenome,
          cpf: dadosEntrega.cpf,
          telefone: dadosEntrega.telefone,
          email: dadosEntrega.email,
          rua: rua,
          numero: numero,
          bairro: bairro
        },
        // Envia o pacote de segurança gerado pelo Mercado Pago
        paymentData: paymentFormData
      })

      // Salva os dados (seja PIX ou Cartão) e limpa a sacola
      setResultadoPagamento(response.data)
      clearCart()
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      alert('Erro ao processar o pedido. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  
  // TELA DE SUCESSO
  if (resultadoPagamento) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Header />
        <main className="container mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center shadow-lg animate-in fade-in zoom-in-95 duration-500">
            <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            
            {resultadoPagamento.pix ? (
              <>
                <h2 className="text-2xl font-bold mb-2">Pedido Recebido!</h2>
                <p className="text-muted-foreground text-sm mb-8">
                  Pague via PIX para que o Chico comece a preparar sua marmita.
                </p>

                <div className="bg-white p-4 rounded-xl inline-block mb-6 border border-zinc-200">
                  {resultadoPagamento.pix.qrCodeBase64 ? (
                    <Image 
                      src={`data:image/jpeg;base64,${resultadoPagamento.pix.qrCodeBase64}`} 
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
                      navigator.clipboard.writeText(resultadoPagamento.pix.qrCodeCopyPaste)
                      alert('Código PIX copiado para a área de transferência!')
                    }}
                    className="w-full flex items-center justify-center gap-2 border border-input hover:bg-muted text-foreground py-3 px-4 rounded-xl font-medium transition-colors"
                  >
                    <Copy className="h-5 w-5" />
                    Copiar Código PIX
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2">Pagamento Aprovado!</h2>
                <p className="text-muted-foreground text-sm mb-8">
                  O seu pagamento foi aprovado com sucesso. O Chico já está preparando sua marmita!
                </p>
              </>
            )}

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

  // FLUXO DE CHECKOUT
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-md">
        
        {/* Controle do Botão de Voltar baseado na etapa atual */}
        {step === 1 ? (
          <Link
            href="/carrinho"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao carrinho
          </Link>
        ) : (
          <button
            onClick={() => setStep(1)}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors bg-transparent border-0 p-0 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos dados de entrega
          </button>
        )}

        <h1 className="mb-6 text-2xl font-bold">
          {step === 1 ? "Dados de Entrega" : "Pagamento Seguro"}
        </h1>

        {/* ETAPA 1: O SEU FORMULÁRIO EXATO E INTACTO */}
        {step === 1 && (
          <form onSubmit={handleIrParaPagamento} className="space-y-6">
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
                          className="w-full border rounded p-2 border-input bg-background focus:ring-2 focus:ring-primary outline-none"
                          value={dadosEntrega.sobrenome}
                          onChange={(e) => setDadosEntrega({ ...dadosEntrega, sobrenome: e.target.value })}
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700">CPF (Obrigatório para o Pix e Cartão)</label>
                      <input
                          type="text"
                          required
                          placeholder="000.000.000-00"
                          className="w-full border rounded p-2 border-input bg-background focus:ring-2 focus:ring-primary outline-none"
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
                          className="w-full border rounded p-2 border-input bg-background focus:ring-2 focus:ring-primary outline-none"
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
                          className="w-full border rounded p-2 border-input bg-background focus:ring-2 focus:ring-primary outline-none"
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

            {/* Rodapé Fixo - Agora avança de tela em vez de já finalizar */}
            <div className="pt-4">
              <div className="mb-4 p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
                <span className="font-medium text-foreground">Total a pagar:</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(totalPrice)}</span>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-4 rounded-xl text-lg transition-colors flex items-center justify-center"
              >
                Ir para o Pagamento
              </button>
            </div>
          </form>
        )}

        {/* ETAPA 2: BRICK DO MERCADO PAGO */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
              <span className="font-medium text-foreground">Total a pagar:</span>
              <span className="text-2xl font-bold text-primary">{formatCurrency(totalPrice)}</span>
            </div>

            <div className={`transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <Payment
                initialization={{ amount: totalPrice }}
                customization={{
                  paymentMethods: {
                    creditCard: "all",
                    debitCard: "all",
                    bankTransfer: "all"
                  },
                }}
                onSubmit={handleFinalizarPedido}
                onError={(error) => {
                  console.error("Erro no Brick:", error)
                  alert("Erro ao carregar o módulo de pagamento do Mercado Pago.")
                }}
              />
            </div>
            
            {loading && (
              <div className="mt-4 text-center text-primary font-bold animate-pulse">
                Processando pagamento, aguarde...
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  )
}