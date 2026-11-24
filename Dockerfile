# Étape 1 : Build du frontend Vue.js
FROM node:20-alpine AS builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Étape 2 : Serveur Backend + fichiers statiques
FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production
COPY server/ ./

# Copie du build Vue dans le dossier public du serveur
COPY --from=builder /app/client/dist ./public

# Dossiers pour la persistance des données et des images
RUN mkdir -p /app/server/data /app/server/uploads

EXPOSE 3000
CMD ["node", "server.js"]
