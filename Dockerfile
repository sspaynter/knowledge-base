# ── Knowledge Base — Dockerfile ───────────────────────────
# Node 20 Alpine, non-root user, health check included.
# No build step — vanilla JS, no bundler.

FROM node:20-alpine AS base

# Non-root user for security
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY server.js ./
COPY public/ ./public/
COPY routes/ ./routes/
COPY middleware/ ./middleware/
COPY services/ ./services/
COPY scripts/ ./scripts/

# Install su-exec for privilege drop in entrypoint
RUN apk add --no-cache su-exec

# Create uploads and vault directories with correct ownership
ENV UPLOAD_DIR=/app/uploads
ENV VAULT_DIR=/app/vault
ENV CHOKIDAR_USEPOLLING=true
RUN mkdir -p /app/uploads /app/vault && chown -R app:app /app

# Entrypoint fixes volume ownership then drops to app user
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
