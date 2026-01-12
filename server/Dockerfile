FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY server/ ./server/
COPY signing-keys-temp/ ./signing-keys-temp/

ENV PORT=3001
EXPOSE 3001

CMD ["node","server/signing-server.js"]
