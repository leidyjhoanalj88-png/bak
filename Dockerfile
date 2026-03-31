# Imagen con Playwright y Navegadores ya incluidos
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Saltamos descargas pesadas
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production

WORKDIR /app

# Copiamos solo el archivo de dependencias
COPY package.json ./

# Instalación limpia para producción
RUN npm install --production

# Copiamos todo el código
COPY . .

# Puerto para Railway/Render
EXPOSE 3000

# Arrancamos el bot
CMD ["node", "index.js"]
