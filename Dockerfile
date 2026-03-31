# 1. Usamos la imagen oficial de Playwright
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# 2. Variables de entorno para ahorrar RAM y evitar descargas
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production
# Esto limita la memoria que NPM puede usar durante la instalación
ENV NPM_CONFIG_MEMORY_LIMIT=400MB 

WORKDIR /app

# 3. Copiar solo el package.json primero
COPY package.json ./

# 4. Instalación ultra-ligera
# --no-scripts evita que Playwright intente configurar cosas pesadas
# --production evita instalar librerías de desarrollo
RUN npm install --production --no-scripts --no-audit --no-fund

# 5. Copiar el resto del bot
COPY . .

# 6. Comando de inicio (Usamos el puerto que Render asigna automáticamente)
EXPOSE 3000
CMD ["node", "index.js"]
