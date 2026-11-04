# ==============================================================================
# DOCKERFILE PRODUCTION POUR COOLIFY & NEXT.JS 15 STANDALONE
# ==============================================================================

# 1. Base Image
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# 2. Dependencies
FROM base AS deps
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# 3. Compilation du projet
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/public

# Génération du client Prisma
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# 4. Image de production finale ultra-légère
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache bash git curl

# Install Claude Code CLI globally for Claude Pro accounts
RUN npm install -g @anthropic-ai/claude-code

# Utilisateur non-root sécurisé avec home directory pour la persistance des sessions CLI
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nextjs nextjs && \
    mkdir -p /home/nextjs/.claude /home/nextjs/.gemini && \
    chown -R nextjs:nodejs /home/nextjs

# Copy and install Antigravity CLI globally for Gemini Pro accounts
COPY scripts/antigravity-cli.js /usr/local/bin/antigravity
RUN chmod +x /usr/local/bin/antigravity && ln -s /usr/local/bin/antigravity /usr/local/bin/agy

# Fichiers statiques et build standalone Next.js
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs
ENV HOME=/home/nextjs

EXPOSE 3000

CMD ["node", "server.js"]
