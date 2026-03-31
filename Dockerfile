FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Variables de entorno
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production

WORKDIR /app

# Copiar configuración
COPY package.json ./

# Instalación limpia
RUN npm install --production

# Copiar código
COPY . .

# Exponer puerto
EXPOSE 3000

# Iniciar
CMD ["node", "index.js"]
