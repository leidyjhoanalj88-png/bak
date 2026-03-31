# 1. Usamos la imagen oficial (basada en Ubuntu Jammy)
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# 2. ESTA LÍNEA ES CLAVE: Evita que el instalador intente descargar
# los navegadores otra vez, porque ya vienen dentro de la imagen.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 3. Directorio de trabajo
WORKDIR /app

# 4. Copiamos los archivos de configuración
# Asegúrate de que el archivo se llame exactamente package.json
COPY package.json ./

# 5. Instalamos las dependencias
# Usamos --no-package-lock para evitar conflictos si no tienes el archivo .lock
RUN npm install --no-package-lock

# 6. Copiamos el resto del código
COPY . .

# 7. Puerto para Render u otros servicios
EXPOSE 3000

# 8. Comando para iniciar el bot
CMD ["node", "index.js"]
