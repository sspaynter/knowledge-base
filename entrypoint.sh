#!/bin/sh
# Fix vault/upload ownership on every startup.
# Volume mounts can arrive with host-side UIDs (e.g. macOS 501:20)
# that the container's app user (100:101) cannot write to.
chown -R app:app /app/vault /app/uploads
exec su-exec app node server.js
