# Multi-stage build: build client, then run server serving static files + socket API
FROM node:18-alpine AS builder
WORKDIR /app

# Install deps
COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
RUN npm install

# Copy source and build client
COPY . .
RUN npm run build --workspace=client

# Runtime image
FROM node:18-alpine
WORKDIR /app

# Copy manifests and install production deps
COPY package*.json ./
COPY server/package*.json server/
RUN npm install --omit=dev

# Copy server source and built client assets
COPY server server
# Copy to both server/public and client/dist so server static fallback works
COPY --from=builder /app/client/dist server/public
RUN mkdir -p client && cp -r server/public client/dist

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/server.js"]
