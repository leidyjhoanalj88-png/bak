# Usamos la imagen oficial que ya trae todas las dependencias de sistema
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Eliminamos SKIP_BROWSER_DOWNLOAD para que el navegador sí esté presente
ENV NODE_ENV=production

# Directorio de trabajo
WORKDIR /app

# Copiamos solo archivos de dependencias primero (mejor uso de caché)
COPY package.json package-lock.json* ./

# Instalamos dependencias de producción
# Nota: La imagen de Playwright ya trae los navegadores, 
# pero npx playwright install asegura que los binarios estén vinculados correctamente.
RUN npm install --production && npx playwright install chromium

# Copiamos el resto del código
COPY . .

# Exponemos el puerto
EXPOSE 3000

# Comando para arrancar
CMD ["node", "index.js"]
