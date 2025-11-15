# Use Bun official image
FROM oven/bun:1.2.19-alpine AS base

# Install dependencies stage
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY apps/server/package.json ./apps/server/
COPY packages/api/package.json ./packages/api/
COPY packages/auth/package.json ./packages/auth/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN bun install --frozen-lockfile --production

# Build stage
FROM base AS builder
WORKDIR /app

# Copy all source files
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Generate Prisma client
RUN cd packages/db && bun run db:generate

# Build all packages
RUN bun run build

# Production stage
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunuser

# Copy built files and dependencies
COPY --from=builder --chown=bunuser:nodejs /app/apps/server/dist ./dist
COPY --from=builder --chown=bunuser:nodejs /app/packages ./packages
COPY --from=deps --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:nodejs /app/apps/server/package.json ./

# Switch to non-root user
USER bunuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1))"

# Start server
CMD ["bun", "run", "start"]
