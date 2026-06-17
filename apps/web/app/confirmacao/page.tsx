'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, Copy, QrCode, MapPin, Loader2 } from 'lucide-react'
import { Header } from '@/components/storefront/header'
import { useCart } from '../../lib/cart-context'
import { api } from '../../services/api'
import { TAXAS_BAIRRO, LOCAIS_ISENTOS } from '../../utils/taxas'
import { initMercadoPago, Payment } from '@mercadopago/sdk-react'


const normalizarTexto = (texto: string) => {
  if (!texto) return '';
  return texto
    .normalize('NFD') // Separa os acentos das letras (ex: 'é' vira 'e' + '´')
    .replace(/[\u0300-\u036f]/g, '') // Remove os acentos de vez
    .toLowerCase() // Passa tudo para minúsculo
    .trim(); // Arranca espaços sobrando no começo e no fim
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatarCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .substring(0, 14)
}

const formatarTelefone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .substring(0, 15)
}

export default function ConfirmacaoPage() {
  const { cart, totalPrice, clearCart, removeItem } = useCart()
  const [valorFinal, setValorFinal] = useState<number>(totalPrice)
  const [taxaEntrega, setTaxaEntrega] = useState<number>(0);
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [resultadoPagamento, setResultadoPagamento] = useState<any>(null)
  const [mpReady, setMpReady] = useState(false)
  const [cpf, setCpf] = useState('')


  useEffect(() => {

    // ✅ Inicializa MercadoPago apenas no cliente
    const initMercadoPago = async () => {
      try {
        const { initMercadoPago } = await import('@mercadopago/sdk-react')
        initMercadoPago('APP_USR-9067035e-c11b-4e2b-97af-c61acc4e616c', { 
          locale: 'pt-BR' 
        })
        setMpReady(true)
        console.log('✅ MercadoPago inicializado com sucesso')
      } catch (error) {
        console.error('❌ Erro ao inicializar MercadoPago:', error)
        alert('Erro ao carregar o sistema de pagamento. Tente novamente.')
      }
    }

    initMercadoPago()
  }, [])

const formatarCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    .substring(0, 14)
}

  // Estados do formulário
  const [nome, setNome] = useState('')
  const [dadosEntrega, setDadosEntrega] = useState({
    nome: '',
    sobrenome: '',
    telefone: '',
    cpf:'',
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: ''
  })

  // Estados para autocomplete
  const [cepInput, setCepInput] = useState('')
  const [ruaInput, setRuaInput] = useState('')
  const [carregandoCep, setCarregandoCep] = useState(false)
  const [carregandoRua, setCarregandoRua] = useState(false)
  const [sugestoesRua, setSugestoesRua] = useState<any[]>([])
  const [mostrarSugestoesRua, setMostrarSugestoesRua] = useState(false)

  useEffect(() => {
    if (!dadosEntrega.bairro) return;

    const cepLimpo = dadosEntrega.cep?.replace(/\D/g, '') || '';
    const bairroLimpo = normalizarTexto(dadosEntrega.bairro);    
    const numeroLimpo = dadosEntrega.numero?.replace(/\D/g, '') || '';

    const isento = LOCAIS_ISENTOS.some(local =>
      cepLimpo === local.cep && numeroLimpo === local.numero
    );

    let valorCalculadoDaTaxa = 0;

    // Se NÃO bateu com o Km da isenção e NÃO bateu com os nomes, cobra a taxa
    if (!isento) {
      valorCalculadoDaTaxa = TAXAS_BAIRRO[bairroLimpo] !== undefined ? TAXAS_BAIRRO[bairroLimpo] : 10.00;
    }

    setTaxaEntrega(valorCalculadoDaTaxa);
    setValorFinal(valorCalculadoDaTaxa + totalPrice);
  }, [dadosEntrega.cep, dadosEntrega.bairro, dadosEntrega.rua, dadosEntrega.numero, totalPrice]);


 // No topo do arquivo, defina qual município aceita
const MUNICIPIO_ACEITO = process.env.NEXT_PUBLIC_MUNICIPIO 
const ESTADO_ACEITO = process.env.NEXT_PUBLIC_ESTADO 

const validarCPF = (cpf: string) => {
  if (!cpf) return false;

  const cpfLimpo = cpf.replace(/\D/g, '');
  
  // Rejeita se não tiver 11 dígitos
  if (cpfLimpo.length !== 11) return false
  
  // Rejeita CPFs conhecidos como inválidos
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false
  
  // Calcula o primeiro dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo[i]) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpfLimpo[9])) return false
  
  // Calcula o segundo dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo[i]) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpfLimpo[10])) return false
  
  return true
}

// Depois, modifique a função handleBuscaCEP:
const handleBuscaCEP = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '')
    
    if (cepLimpo.length !== 8) return

    setCarregandoCep(true)
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      const data = await response.json()

      // Função auxiliar para limpar os campos quando o CEP der errado
      const limparCamposEndereco = () => {
        setRuaInput('')
        setDadosEntrega(prev => ({
          ...prev,
          cep: '',
          rua: '',
          bairro: '',
          cidade: '',
          estado: '',
          numero: '' // Limpa o número também por segurança
        }))
      }

      // 1. Caiu aqui se o CEP for inventado/inválido
      if (data.erro) {
        alert('CEP não encontrado. Por favor, verifique o número digitado.')
        limparCamposEndereco()
        return
      }

      // 2. Caiu aqui se o CEP for de outra cidade
      if (data.localidade !== MUNICIPIO_ACEITO || data.uf !== ESTADO_ACEITO) {
        alert(`❌ Desculpe, só entregamos em ${MUNICIPIO_ACEITO}, ${ESTADO_ACEITO}. Você digitou um CEP de ${data.localidade}, ${data.uf}.`)
        limparCamposEndereco()
        return
      }
	
      // 3. Sucesso! Preenche tudo.
      setDadosEntrega(prev => ({
        ...prev,
        cep: `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`,
        rua: data.logradouro,
        bairro: data.bairro,
        cidade: data.localidade,
        estado: data.uf
      }))
      setRuaInput(data.logradouro)

    } catch (error) {
      console.error('Erro ao buscar CEP:', error)
      alert('Ocorreu um erro ao buscar o CEP. Tente novamente.')
      
      // Limpa também se a internet cair ou a API do ViaCEP falhar
      setCepInput('')
      setRuaInput('')
      setDadosEntrega(prev => ({ ...prev, cep: '', rua: '', bairro: '', cidade: '', estado: '', numero: '', complemento: ''  }))
      
    } finally {
      setCarregandoCep(false)
    }
  }

// Também modifique a busca de rua para filtrar por município:
const handleBuscaRua = async (query: string) => {
  setRuaInput(query)
  
  if (query.length < 3) {
    setSugestoesRua([])
    setMostrarSugestoesRua(false)
    return
  }

  setCarregandoRua(true)
  try {
    // Sempre busca no município específico
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?street=${query}&city=${MUNICIPIO_ACEITO}&state=${ESTADO_ACEITO}&country=Brazil&format=json&limit=5`
    )
    const data = await response.json()
    setSugestoesRua(data)
    setMostrarSugestoesRua(true)
  } catch (error) {
    console.error('Erro ao buscar rua:', error)
  } finally {
    setCarregandoRua(false)
  }
}

  // ✅ SELECIONAR UMA SUGESTÃO DE RUA
  const handleSelecionarRua = (sugestao: any) => {
    const enderecoParts = sugestao.address.split(',')
    const rua = enderecoParts[0]?.trim() || sugestao.name
    const bairro = sugestao.address.includes('bairro')
      ? enderecoParts.find((p: string) => p.includes('bairro'))?.trim()
      : dadosEntrega.bairro

    setDadosEntrega(prev => ({
      ...prev,
      rua,
      bairro: bairro || prev.bairro
    }))
    setRuaInput(rua)
    setSugestoesRua([])
    setMostrarSugestoesRua(false)
  }

  const handleIrParaPagamento = async (e: React.FormEvent) => {
    console.log('ta entrando')
    e.preventDefault()
    let valido = true;
    const cpfValido = validarCPF(dadosEntrega.cpf)
      if (!cpfValido) {
        alert('CPF válido é obrigatório')
        setLoading(false)
	valido=false;
        return
      }
     console.log('cpf valido')
      const cepLimpo = dadosEntrega.cep?.replace(/\D/g, '') || '';
      if (cepLimpo.length !== 8) {
        alert('Por favor, digite um CEP válido com 8 números.');
        setLoading(false);
	valido=false;
        return;
      }

     console.log('cep valido')
      // 3. Trava de Rua e Bairro vazios (Impede o malandrinho do CEP "15")
      if (!dadosEntrega.rua || dadosEntrega.rua.trim() === '') {
        alert('O nome da rua está vazio. Informe um CEP válido para preencher automaticamente');
        setLoading(false);
	valido=false;
        return;
      }

     console.log('rua existe')
      if (!dadosEntrega.bairro || dadosEntrega.bairro.trim() === '') {
        alert('O bairro está vazio. Informe um CEP válido para preencher automaticamente');
        setLoading(false);
	valido=false;
        return;
      }

     console.log('bairro existe')
      // 4. Trava do Número (A única coisa que o cliente digita manualmente além do CEP)
      if (!dadosEntrega.numero || dadosEntrega.numero.trim() === '') {
        alert('Por favor, informe o número do endereço.');
        setLoading(false);
	valido=false;
        return;
      }

     console.log('numero existe')

    if (cart.length === 0) {
      alert('O seu carrinho está vazio!')
	valido=false;
      return
    }

    // Bloqueia o botão para evitar cliques duplos e mostra carregamento
    setLoading(true)

    try {
      // 1. Pede ao Back-end para verificar se o WhatsApp existe
      const response = await api.post('/whatsapp/validar', { 
        telefone: dadosEntrega.telefone 
      })

      // 2. Se a API disser que é falso, bloqueia e avisa o utilizador
      if (response.data.valido === false) {
        alert('❌ O número informado não parece ter um WhatsApp ativo. Por favor, insira um número de WhatsApp válido para receber as atualizações do seu pedido.')
        setLoading(false)
        return // Impede de ir para o passo 2
      }
      if (!cpfValido){
        alert('O CPF não é válido')
        setLoading(false)
        return
      }
      
      // 3. Se passou no teste (ou se o bot estava offline), avança para o pagamento!
      setStep(2)

    } catch (error) {
      // Se a API falhar (ex: erro de rede), deixamos passar por segurança
      console.error('Erro ao validar WhatsApp:', error)
      if(valido===true){
         setStep(2)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleFinalizarPedido = async (paymentFormData: any) => {
    setLoading(true)
    try {

      const itensPedido = cart.map((item: any) => ({
        pratoId: item.pratoId || item.id,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario || item.preco,
        adicionaisEscolhidos: item.adicionaisEscolhidos || []
      }))
      console.log('Itens do pedido:', itensPedido)
      const response = await api.post('/pedidos', {
        clienteId: "Ajustado pelo backend",
	taxa: taxaEntrega,
        total: valorFinal,
        itens: itensPedido,
        dadosEntrega: {
          nome: nome,
          sobrenome: dadosEntrega.sobrenome,
          telefone: dadosEntrega.telefone,
          cpf: dadosEntrega.cpf,
	  cep: dadosEntrega.cep,
          rua: dadosEntrega.rua,
          numero: dadosEntrega.numero,
          bairro: dadosEntrega.bairro,
          cidade: dadosEntrega.cidade,
          estado: dadosEntrega.estado,
          complemento: dadosEntrega.complemento
	},
        paymentData: paymentFormData
      })

      setResultadoPagamento(response.data)
      clearCart()
    } catch (error: any) {
      if (error.response?.data?.error === 'LOJA_FECHADA') {
        alert("⚠️ Operação bloqueada: " + error.response.data.message);
        window.location.href = "/";
        return;
      }

if (error.response?.data?.idsRemover) {
        alert(`❌ Ops! ${error.response.data.erro} Eles serão retirados do seu carrinho agora.`);
        
        const idsProblematicos = error.response.data.idsRemover;
        
        // Varre o carrinho tirando um por um (isso atualiza o LocalStorage sozinho!)
        idsProblematicos.forEach((id: string) => {
          removeItem(id); // Use o nome exato da função do seu useCart
        });

        // Opcional: Redireciona o cliente de volta pro cardápio pra ele escolher outra coisa
        window.location.href = '/'; 
        return;
      }

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

        {/* ETAPA 1: FORMULÁRIO COM AUTOCOMPLETE */}
        {step === 1 && (
          <form onSubmit={handleIrParaPagamento} className="space-y-6">
            {/* Contato */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider mb-2">
                Nome do Comprador
              </h3>

              <div>
                <label className="text-sm font-semibold mb-1.5 block">Nome Completo</label>
                <input
                  required
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Ex: Fernando"
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
                  placeholder="Ex: Beise"
	        />
              </div>

              {/* ✅ CAMPO CPF - APARECE SEMPRE (será validado se for PIX) */}
          
            <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider">
              Dados Pessoais
            </h3>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">CPF (obrigatório para PIX)</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={dadosEntrega.cpf}
	        required
                onChange={(e) => setDadosEntrega({ ...dadosEntrega, cpf: formatarCPF(e.target.value) })}
                maxLength={14}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

	    <div>
                <label className="block text-sm font-medium">Telefone / WhatsApp</label>
                <input
                  type="text"
                  required
                  placeholder="(51) 99999-9999"
                  className="w-full border rounded p-2 border-input bg-background focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={dadosEntrega.telefone}
                  onChange={(e) => setDadosEntrega({
                    ...dadosEntrega,
                    telefone: formatarTelefone(e.target.value)
                  })}
                />
            </div>
          </div>
        

            {/* Endereço com Autocomplete */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </h3>

              {/* CEP */}
              <div>
                <label className="text-sm font-semibold mb-1.5 block">CEP</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="00000-000"
                    className="flex-1 h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                    value={cepInput}
		    required
                    onChange={(e) => {
                      const cep = e.target.value.replace(/\D/g, '')
                      const cepFormatado = cep.slice(0, 8)
                      setCepInput(cepFormatado)
                      
                      // ✅ BUSCA AUTOMÁTICA ao completar 8 dígitos
                      if (cepFormatado.length === 8) {
                        handleBuscaCEP(cepFormatado)
                      }
                    }}
                  />
                  {carregandoCep && <Loader2 className="h-12 px-4 animate-spin text-primary" />}
                </div>
                {dadosEntrega.cidade && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {dadosEntrega.cidade}, {dadosEntrega.estado}
                  </p>
                )}
              </div>

              {/* Rua com Autocomplete */}
              <div className="relative">
                <label className="text-sm font-semibold mb-1.5 block">Rua</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite a rua..."
                    className="flex-1 h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                    value={ruaInput}
                    onChange={(e) => handleBuscaRua(e.target.value)}
                    onFocus={() => sugestoesRua.length > 0 && setMostrarSugestoesRua(true)}
                    style={{backgroundColor: '#d8d7d7' }}
                    required disabled
                  />
                  {carregandoRua && <Loader2 className="h-12 px-4 animate-spin text-primary" />}
                </div>

                {/* Dropdown de Sugestões */}
                {mostrarSugestoesRua && sugestoesRua.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {sugestoesRua.map((sugestao, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelecionarRua(sugestao)}
                        className="w-full text-left px-4 py-3 hover:bg-muted border-b border-border last:border-0 text-sm transition-colors"
                      >
                        <div className="font-medium">{sugestao.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {sugestao.address}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Número e Bairro */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Número</label>
                  <input
                    required
                    type="text"
                    value={dadosEntrega.numero}
                    onChange={(e) => setDadosEntrega({ ...dadosEntrega, numero: e.target.value })}
                    className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="123, S/N, Km 12"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1.5 block">Bairro</label>
                  <input
                    required
                    type="text"
                    value={dadosEntrega.bairro}
                    onChange={(e) => setDadosEntrega({ ...dadosEntrega, bairro: e.target.value })}
                    className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                    placeholder="Centro"
                    style={{backgroundColor: '#d8d7d7' }}
                    disabled
                  />
                </div>
              </div>
              <div>
              <label className="text-sm font-semibold mb-1.5 block">Complemento</label>
              <input
                type="text"
                value={dadosEntrega.complemento}
                onChange={(e) => setDadosEntrega({ ...dadosEntrega, complemento: e.target.value })}
                className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Apartamento, casa, etc."
              />
            </div>
            </div>
            

            {/* Botão */}
            <div className="pt-4">

	     <div className="mb-4 p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
                <span className="font-small text-foreground">TeleEntrega:</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(taxaEntrega)}</span>
              </div>


              <div className="mb-4 p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
                <span className="font-medium text-foreground">Total a pagar:</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(valorFinal)}</span>
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

        {/* ETAPA 2: PAGAMENTO */}
        {step === 2 && mpReady && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

	  <div className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
            <span className="font-small text-foreground">TeleEntrega:</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(taxaEntrega)}</span>
          </div>


          <div className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20 flex justify-between items-center">
            <span className="font-medium text-foreground">Total a pagar:</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(valorFinal)}</span>
          </div>
          
          {mpReady ? (
            <div className={`transition-opacity duration-300 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <Payment
                key={valorFinal}
                initialization={{ amount: Number(valorFinal) }}
                customization={{
                  paymentMethods: {
                    creditCard: "all",
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
          ) : (
            <div className="text-center text-muted-foreground">
              Carregando sistema de pagamento...
            </div>
          )}
          
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
