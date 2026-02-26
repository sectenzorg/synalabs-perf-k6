FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install k6 binary natively inside the container 
# Using the official image to copy the binary ensures architecture compatibility (AMD64/ARM64)
COPY --from=grafana/k6:latest /usr/bin/k6 /usr/local/bin/k6

# Install essential system utilities for the app and prisma
RUN apk add --no-cache ca-certificates curl openssl postgresql-client

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/artifacts && \
    chown -R nextjs:nodejs /app

USER nextjs

# Although Next.js standalone bundles production deps, some CLIs like prisma and tools like ts-node 
# used in the entrypoint cycle need to be explicitly available in the runner environment.
COPY --chown=nextjs:nodejs package.json package-lock.json* ./
RUN npm install prisma ts-node typescript @types/node --save-prod --legacy-peer-deps

USER root
# Copy optimized build from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Ensure execution permits for the entrypoint
RUN chmod +x docker-entrypoint.sh

# Switch back to non-root for execution
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
