# Usa uma imagem leve do Node.js
FROM node:20-alpine

# Define a pasta de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto do código
COPY . .

# Compila o projeto Next.js
RUN npm run build

# Expõe a porta do site
EXPOSE 3000

# Inicia o servidor do Next.js
CMD ["npm", "start"]
