# Dockerfile

# Usa uma imagem base oficial do Node.js
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app/backend

# Copia os arquivos package.json e package-lock.json para instalar as dependências
COPY backend/package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código do backend para o diretório de trabalho
COPY backend/src ./src/

# Cria o diretório para os dados do SQLite e define permissões
RUN mkdir -p /app/data
RUN chown -R node:node /app/data

# Define o usuário 'node' para executar a aplicação, por segurança
USER node

# Expõe a porta em que a aplicação Node.js vai rodar
EXPOSE 3000

# Comando para iniciar a aplicação quando o container for executado
CMD ["node", "src/app.js"]