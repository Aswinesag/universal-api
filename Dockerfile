# Production Dockerfile for Universal AI API Hub
FROM node:20-alpine AS base

# Install OpenSSL for Prisma engine
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies based on lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NODE_ENV=production
RUN npm run build

# Expose default port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Entrypoint: Sync SQLite schema, seed initial connectors, and start server
CMD ["sh", "-c", "npx prisma db push && npm run db:seed && npm run start"]
