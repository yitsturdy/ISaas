# Multi-stage Dockerfile for a Next.js frontend
# Builds the app in the builder stage and produces a small runtime image.

# Base image
FROM node:18-alpine AS base
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++ libc6-compat

# Install dependencies (full) in a deps stage so the layer can be cached
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Build the application
FROM deps AS builder
COPY . .
RUN npm run build

# Final runtime image
FROM node:18-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Create non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy only what is needed to run the app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Copy installed node_modules from deps stage and remove dev deps
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --production || true

USER nextjs
EXPOSE 3000
ENV PORT=3000

# Use the start script defined in package.json (should run "next start")
CMD ["npm", "run", "start"]