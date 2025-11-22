# Stage 1: Base image with Bun
FROM oven/bun:latest AS base
WORKDIR /app

# Stage 2: Install turbo CLI (needed for pruning)
FROM base AS tools
RUN bunx npm install -g turbo@latest

# Stage 3: Prune the monorepo to just @favy/workflow workspace
FROM tools AS prune
# Copy everything for pruning
COPY . .
# Prune the monorepo to reduce context for Docker
RUN turbo prune @favy/workflow --docker

# Stage 4: Install dependencies and build
FROM base AS builder
WORKDIR /app
# Copy pruned files (package.json, lockfile, etc)
COPY --from=prune /app/out/json/ ./
# Copy tsconfig.base.json (not included in prune output but referenced by packages)
COPY --from=prune /app/tsconfig.base.json ./tsconfig.base.json
# Install all dependencies
RUN bun install --frozen-lockfile
# Copy full source of the app
COPY --from=prune /app/out/full/ ./
# Build the server (not the library index.ts)
RUN cd apps/workflow && bun build ./src/server.ts --outdir dist --minify --target=bun

# Stage 5: Production image
FROM oven/bun:latest AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built output and production dependencies
COPY --from=builder /app/apps/workflow/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Optional: Use non-root user
USER bun

# Expose port (adjust if your server listens elsewhere)
EXPOSE 3000

# Start the server (built JS)
CMD ["bun", "dist/server.js"]
