# 🍲 Marmitas do Chico

> **Sistema completo de e-commerce e gestão de delivery desenvolvido como Projeto Integrador.**

O **Marmitas do Chico** é uma plataforma *full-stack* desenvolvida para digitalizar e automatizar os processos de um negócio real de venda de marmitas caseiras. O objetivo principal é substituir processos manuais de anotação de pedidos e controle financeiro por um sistema centralizado, inteligente e de fácil uso, tanto para o cliente final quanto para o proprietário.

---

## Principais Funcionalidades

O projeto foi dividido em duas frentes principais de experiência:

### Visão do Cliente (E-commerce)
* **Cardápio Dinâmico:** Visualização de marmitas disponíveis atualizadas em tempo real.
* **Sistema de Status da Loja:** Bloqueio automático de compras fora do horário de expediente ou durante o preparo.
* **Carrinho de Compras:** Gerenciamento de itens locais para facilitar o pedido.
* **Checkout Transparente:** Pagamentos integrados diretamente via API do **Mercado Pago**.

### Visão do Administrador (Vendedor)
* **Gerenciamento de Cardápio:** Criação, edição e exclusão lógica (*soft delete*) de pratos, mantendo a integridade do histórico de vendas.
* **Controle de Fluxo:** Botão de "Abrir/Fechar" a loja, que atualiza instantaneamente o site dos clientes.
* **Dashboard de Inteligência de Negócios:** Painel com indicadores-chave (KPIs) e gráficos dinâmicos (via Recharts) mostrando faturamento, dias de pico e distribuição de meios de pagamento.
* **Gestão de Entregas:** (Em desenvolvimento) Impressão simplificada de comandas para auxiliar a logística.

---

## Tecnologias Utilizadas

Este projeto utiliza uma arquitetura moderna baseada em JavaScript/TypeScript (Monorepo), separando as responsabilidades entre Front-end e Back-end.

**Front-end (Web App)**
* [React](https://reactjs.org/) & [Next.js](https://nextjs.org/)
* [Tailwind CSS](https://tailwindcss.com/) (Estilização)
* [shadcn/ui](https://ui.shadcn.com/) & Radix UI (Componentes acessíveis)
* [Recharts](https://recharts.org/) (Visualização de dados/Dashboard)

**Back-end (API)**
* [Node.js](https://nodejs.org/)
* [Fastify](https://fastify.dev/) (Framework web de alta performance)
* JWT (Autenticação e Segurança)

**Banco de Dados & Infraestrutura**
* [PostgreSQL](https://www.postgresql.org/) (Hospedado no [Neon](https://neon.tech/))
* [Prisma ORM](https://www.prisma.io/) (Modelagem e migrações)
* [Oracle Cloud Infrastructure (OCI)](https://www.oracle.com/cloud/) (Hospedagem da Máquina Virtual Ubuntu Linux com PM2)

**Integrações Externas**
* **Mercado Pago API** (Processamento de pagamentos)
* **WhatsApp Business API** (Planejado para broadcast de cardápios)

---

## Como rodar o projeto localmente

Siga os passos abaixo para testar o sistema na sua máquina:

### 1. Pré-requisitos
Certifique-se de ter instalado:
* **Node.js** (versão 20+ recomendada)
* **Git**
* Uma conta no [Neon](https://neon.tech/) (ou banco PostgreSQL local) e no [Mercado Pago](https://www.mercadopago.com.br/developers) para obter as chaves de teste.

### 2. Clonando o repositório

git clone [https://github.com/Fernando-Beise/marmitas-do-chico.git](https://github.com/SEU-USUARIO/marmitas-do-chico.git)
cd marmitas-do-chico

### 3. Configurando as Variáveis de Ambiente

Crie um arquivo .env na raiz dos projetos (ou nas respectivas pastas de web e api) seguindo o modelo abaixo:

# Banco de Dados (Prisma)
DATABASE_URL="postgresql://usuario:senha@seu-host.neon.tech/nome-do-banco?sslmode=require"

# Segurança da API
JWT_SECRET="sua_chave_secreta_super_segura"

# Mercado Pago
NEXT_PUBLIC_MP_PUBLIC_KEY="TEST-sua-public-key"
MP_ACCESS_TOKEN="TEST-seu-access-token"

### 4. Instalando dependências e Banco de Dados

# Instale as dependências na pasta raiz (ou nas pastas do monorepo)
npm install

# Execute as migrações do banco de dados
npx prisma migrate dev

### 5. Iniciando os servidores
Bash

# Inicie o back-end (API)
npm run dev

# Em outro terminal, inicie o front-end (Web)
npm run dev

Desenvolvedor:
Projeto idealizado e desenvolvido por Fernando Beise para a disciplina de Projeto Integrador.
A arquitetura foi pensada não apenas como um exercício acadêmico, mas como um produto real e escalável pronto para produção.