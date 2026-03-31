# Usamos la imagen oficial que ya trae todo lo de Playwright
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el código del bot
COPY . .

# Exponer el puerto que usa Render
EXPOSE 3000

# Arrancar el bot
CMD ["npm", "start"]
