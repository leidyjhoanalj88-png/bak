FROM mcr.microsoft.com/playwright:v1.40.0-jammy

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production

WORKDIR /app

# Copiamos solo el package.json
COPY package.json ./

# Instalación ignorando el archivo lock que tiene la versión mala registrada
RUN npm install --production --no-package-lock --no-scripts

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
