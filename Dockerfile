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

# Create uploads and vault directories with correct ownership
ENV UPLOAD_DIR=/app/uploads
ENV VAULT_DIR=/app/vault
ENV CHOKIDAR_USEPOLLING=true
RUN mkdir -p /app/uploads /app/vault && chown -R app:app /app

# Switch to non-root user
USER app

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
