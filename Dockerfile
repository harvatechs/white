# ==============================================================================
# WHITE Search — Production Multi-Stage Dockerfile
# ==============================================================================
# Lightweight, secure, non-root standalone container for WHITE Search.

# ------------------------------------------------------------------------------
# 1. Base Image
# ------------------------------------------------------------------------------
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ------------------------------------------------------------------------------
# 2. Dependencies
# ------------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json* pnpm-lock.yaml* bun.lock* ./
COPY prisma ./prisma/

# Install dependencies using whichever package manager is available
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f bun.lock ]; then npm i; \
  else npm i; \
  fi

# Generate Prisma Client
RUN npx prisma generate

# ------------------------------------------------------------------------------
# 3. Builder
# ------------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js application
RUN npm run build

# ------------------------------------------------------------------------------
# 4. Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/db/custom.db"

# Install openssl for Prisma runtime
RUN apk add --no-cache openssl

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create database and public directories with proper ownership
RUN mkdir -p /app/db /app/public && chown -R nextjs:nodejs /app/db /app/public

# Copy standalone build outputs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/preferences || exit 1

CMD ["node", "server.js"]
