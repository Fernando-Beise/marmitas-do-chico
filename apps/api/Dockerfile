# Usa uma imagem leve do Node.js
FROM node:20-alpine

# Define a pasta de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências
RUN npm install

# Copia o resto do código do backend
COPY . .

# Gera o cliente do Prisma
RUN npx prisma generate

# Compila o código TypeScript (se você usa build)
RUN npm run build

# Expõe a porta que a API vai rodar
EXPOSE 3001

# O comando para iniciar será passado pelo docker-compose para rodar as migrations antes
CMD ["npm", "start"]
