# Étape 1 : Builder l'application
FROM node:20-alpine AS builder

WORKDIR /app

# Installer pnpm globalement
RUN npm install -g pnpm

# Copier les fichiers du projet
COPY . .

# Installer les dépendances
RUN pnpm install

# Étape 2 : Lancer l'application compilée
FROM node:20-alpine

WORKDIR /app

# Installer pnpm
RUN npm install -g pnpm

# Copier les fichiers compilés depuis le builder
COPY --from=builder /app /app

# Exposer le port (Webstudio utilise 8787 par défaut en prod)
EXPOSE 3000

# Commande pour lancer le serveur en mode prod
CMD ["pnpm", "dev"]
