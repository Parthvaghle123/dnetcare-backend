# Base image
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Build stage
FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm run build

# Production stage
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
