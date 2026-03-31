# 1. Usamos la imagen oficial de Playwright (incluye navegadores y Linux Jammy)
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# 2. Variables de entorno para ahorrar RAM y evitar descargas pesadas
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production
ENV NPM_CONFIG_LOGLEVEL=warn

# 3. Directorio de trabajo dentro del contenedor
WORKDIR /app

# 4. Copiamos el package.json primero
# Nota: Si tienes un package-lock.json local que esté fallando, 
# el comando siguiente lo ignorará para evitar conflictos de integridad.
COPY package*.json ./

# 5. INSTALACIÓN DE FUERZA BRUTA (Optimizada para 512MB de RAM en Render)
# - Borramos cualquier rastro de archivos lock previos
# - Instalamos solo lo necesario para producción
# - Ignoramos scripts de post-instalación que consumen mucha CPU
RUN rm -rf package-lock.json node_modules && \
    npm install --production --no-scripts --no-audit --no-fund --unsafe-perm

# 6. Copiamos el resto del código del bot
COPY . .

# 7. Exponemos el puerto (Render usa el 3000 por defecto o el que asignes en ENV)
EXPOSE 3000

# 8. Comando para arrancar el bot
CMD ["node", "index.js"]
