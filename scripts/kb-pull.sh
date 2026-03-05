#!/usr/bin/env bash
# kb-pull.sh — Pull pages from KB API to local vault
# Usage: kb-pull.sh [--since] [--full]
#   --since  Use last pull timestamp (default if .kb-last-pull exists)
#   --full   Pull all pages regardless of timestamp
#
# Env vars:
#   KB_API_URL   — KB base URL (default: https://kb.ss-42.com)
#   KB_API_TOKEN — Bearer token for KB API (required)
#   KB_VAULT_DIR — Local vault directory (default: ~/Documents/Claude/knowledge-base/vault)

set -euo pipefail

KB_LAN_URL="http://192.168.86.18:32781"
KB_WAN_URL="https://kb.ss-42.com"
KB_VAULT_DIR="${KB_VAULT_DIR:-$HOME/Documents/Claude/knowledge-base/vault}"
LAST_PULL_FILE="$KB_VAULT_DIR/.kb-last-pull"
LOG_FILE="$HOME/.kb-sync.log"

# Auto-detect LAN: try local NAS with 1-second timeout, fall back to public URL
resolve_api_url() {
  if [ -n "${KB_API_URL:-}" ]; then
    echo "$KB_API_URL"  # Explicit override — respect it
  elif curl -s --connect-timeout 1 -o /dev/null "$KB_LAN_URL/api/version" 2>/dev/null; then
    echo "$KB_LAN_URL"
  else
    echo "$KB_WAN_URL"
  fi
}
KB_API_URL=$(resolve_api_url)

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
  echo "$1"
}

# Log which route was chosen
if [[ "$KB_API_URL" == *"192.168"* ]]; then
  log "PULL: Using LAN ($KB_API_URL)"
else
  log "PULL: Using WAN ($KB_API_URL)"
fi

# Validate token
if [ -z "${KB_API_TOKEN:-}" ]; then
  log "ERROR: KB_API_TOKEN is not set"
  exit 1
fi

# Determine since timestamp
SINCE=""
FORCE_FULL=false

for arg in "$@"; do
  case "$arg" in
    --full) FORCE_FULL=true ;;
    --since) ;; # default behavior
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

if [ "$FORCE_FULL" = false ] && [ -f "$LAST_PULL_FILE" ]; then
  SINCE=$(cat "$LAST_PULL_FILE")
fi

# Build API URL
API_URL="$KB_API_URL/api/pages/export"
if [ -n "$SINCE" ]; then
  ENCODED_SINCE=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$SINCE")
  API_URL="$API_URL?since=$ENCODED_SINCE"
  log "PULL: Fetching pages updated since $SINCE"
else
  log "PULL: Fetching all pages (full sync)"
fi

# Fetch from API
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET "$API_URL" \
  -H "Authorization: Bearer $KB_API_TOKEN" \
  -H "Accept: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -lt 200 ] || [ "$HTTP_CODE" -ge 300 ]; then
  ERROR=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error','Unknown error'))" 2>/dev/null || echo "$BODY")
  log "ERROR: HTTP $HTTP_CODE pulling pages — $ERROR"
  exit 1
fi

# Process pages — write only if server is newer than local file
# Pipe curl output to Python3 via stdin (safe for any JSON content)
RESULT=$(echo "$BODY" | python3 -c "
import json, sys, os
from datetime import datetime

vault_dir = sys.argv[1]
data = json.load(sys.stdin)
pages = data.get('pages', [])
written = 0
skipped = 0

for page in pages:
    file_path = page.get('file_path')
    content = page.get('content', '')
    server_updated = page.get('updated_at', '')

    if not file_path:
        skipped += 1
        continue

    local_path = os.path.join(vault_dir, file_path)

    # Compare timestamps — only write if server is newer
    if os.path.exists(local_path):
        local_mtime = os.path.getmtime(local_path)
        try:
            server_ts = server_updated.replace('Z', '+00:00')
            server_dt = datetime.fromisoformat(server_ts)
            if server_dt.timestamp() <= local_mtime:
                skipped += 1
                continue
        except (ValueError, TypeError):
            pass  # Cannot parse timestamp — write anyway

    # Create directories as needed
    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    # Write file
    with open(local_path, 'w') as f:
        f.write(content)
    written += 1

print(f'{written} written, {skipped} skipped, {len(pages)} total')
" "$KB_VAULT_DIR")

log "PULL: $RESULT"

# Record pull timestamp
date -u '+%Y-%m-%dT%H:%M:%S.000Z' > "$LAST_PULL_FILE"

log "PULL: Complete. Timestamp saved to $LAST_PULL_FILE"
