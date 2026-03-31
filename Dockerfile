FROM mcr.microsoft.com/playwright:v1.40.0-jammy

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production

WORKDIR /app

COPY package.json ./
RUN npm install --production
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
