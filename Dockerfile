# 1. Usamos la imagen base
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# 2. Forzamos a NPM a no descargar navegadores y a ignorar scripts de error
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NPM_CONFIG_LOGLEVEL=warn

# 3. Directorio de trabajo
WORKDIR /app

# 4. Copiar package.json
COPY package.json ./

# 5. INSTALACIÓN CRÍTICA:
# --unsafe-perm ayuda con problemas de permisos en contenedores
# --ignore-scripts evita que Playwright intente reinstalar lo que ya existe
RUN npm install --unsafe-perm --ignore-scripts

# 6. Copiar el código
COPY . .

# 7. Exponer puerto
EXPOSE 3000

# 8. Comando de inicio
CMD ["node", "index.js"]
