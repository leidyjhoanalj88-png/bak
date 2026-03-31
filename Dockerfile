# Usamos la imagen oficial de Playwright
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Directorio de la app
WORKDIR /usr/src/app

# Instalar dependencias primero (para aprovechar el cache de Docker)
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Comando por defecto para correr el bot
CMD [ "npm", "start" ]
