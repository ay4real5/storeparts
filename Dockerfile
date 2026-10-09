# syntax=docker/dockerfile:1

# ---- base -------------------------------------------------------------------
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: full install (postinstall runs `prisma generate`) ----------------
FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ---- build ------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/src/generated ./src/generated
RUN npm run build

# ---- migrate tools: Prisma CLI + admin bootstrap, kept apart from the app ---
FROM base AS migrate
WORKDIR /opt/migrate
COPY docker/migrate/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY docker/migrate/prisma.config.ts docker/migrate/create-admin.mjs ./
COPY prisma/schema.prisma ./prisma/schema.prisma
COPY prisma/migrations ./prisma/migrations

# ---- runtime ----------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads

RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs \
 && mkdir -p /app/uploads \
 && chown nextjs:nodejs /app/uploads

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=migrate /opt/migrate /opt/migrate
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint.sh

USER nextjs
EXPOSE 3000
VOLUME ["/app/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
