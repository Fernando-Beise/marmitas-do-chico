# Marmitas do Chico

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

## Como rodar o projeto localmente (Docker & Docker Compose)

Para facilitar a avaliação da banca e garantir que o ambiente execute exatamente da mesma forma em qualquer máquina sem a necessidade de instalar dependências globais, o sistema foi totalmente containerizado.

Siga os passos abaixo para subir a aplicação completa na sua máquina:

### 1. Pré-requisitos
Antes de começar, certifique-se de ter instalado:
* **Git**
* **Docker Desktop** (ou Docker Engine + Docker Compose)

### 2. Clonando o repositório

git clone [https://github.com/Fernando-Beise/marmitas-do-chico.git](https://github.com/Fernando-Beise/marmitas-do-chico.git)
cd marmitas-do-chico

### 2. Clonando o repositório

git clone [https://github.com/Fernando-Beise/marmitas-do-chico.git](https://github.com/Fernando-Beise/marmitas-do-chico.git)
cd marmitas-do-chico

### 3. Configurando as Variáveis de Ambiente

Na raiz do projeto (onde está localizado o arquivo docker-compose.yml), crie um arquivo chamado .env. O Docker Compose utilizará essas variáveis para expor as portas de segurança e injetar as chaves necessárias:

# Segurança da API
JWT_SECRET="sua_chave_secreta_super_segura"

# Mercado Pago
NEXT_PUBLIC_MP_PUBLIC_KEY="TEST-sua-public-key"
MP_ACCESS_TOKEN="TEST-seu-access-token"

### 4. Inicializando a Orquestração (Deploy Local)

Com o terminal aberto na raiz do projeto, execute o comando abaixo para baixar as imagens oficiais, construir as imagens da aplicação (Front-end e Back-end), rodar as migrações do banco de dados e injetar o seed inicial:

docker-compose up -d --build

Para acompanhar a inicialização dos servidores, geração do QR Code de conexão do WhatsApp Business (Baileys) ou logs de depuração:

docker logs marmitas_api -f

### 5. Acessando o Sistema

Assim que os contêineres estiverem de pé (Status: Up), o sistema estará acessível através dos seguintes endereços locais:

Frente de Loja (Cliente): http://localhost:3000
Painel Administrativo (Dono/Admin): http://localhost:3000/login
Healthcheck da API (Back-end): http://localhost:3001/health

Credenciais de Acesso (Painel Administrativo)

O contêiner do banco de dados executa automaticamente o arquivo de sementes (seed.ts) na primeira inicialização. Para acessar o painel de gerenciamento de marmitas, relatórios de vendas e disparos do WhatsApp, utilize o usuário administrador padrão criado pelo sistema:

E-mail/Login: [vendedor@gmail.com] (Substitua aqui pelo e-mail real do seu arquivo seed, ex: admin@marmitasdochico.com)
Senha: [senha123] (Substitua aqui pela senha real definida no seu arquivo seed)

6. Encerrando os Serviços

Para parar a execução da aplicação de forma segura sem perder os dados salvos ou as configurações de autenticação do WhatsApp (armazenados em volumes locais isolados):

docker-compose down

Desenvolvedor:
Projeto idealizado e desenvolvido por Fernando Beise para a disciplina de Projeto Integrador.
A arquitetura foi pensada não apenas como um exercício acadêmico, mas como um produto real e escalável pronto para produção.
