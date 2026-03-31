FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copiar dependencias
COPY package.json ./
RUN npm install --production

# Instalar SOLO Chromium para ahorrar espacio y RAM
RUN npx playwright install chromium --with-deps

# Copiar el resto del código
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
