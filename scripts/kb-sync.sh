#!/usr/bin/env bash
# kb-sync.sh — Push a local vault .md file to the KB API
# Usage: kb-sync.sh <vault-relative-path>
#   e.g.: kb-sync.sh operations/engineering-practice/my-doc.md
#
# Env vars:
#   KB_API_URL   — KB base URL (default: https://kb.ss-42.com)
#   KB_API_TOKEN — Bearer token for KB API (required)
#   KB_VAULT_DIR — Local vault directory (default: ~/Documents/Claude/knowledge-base/vault)

set -euo pipefail

KB_LAN_URL="http://192.168.86.18:32781"
KB_WAN_URL="https://kb.ss-42.com"
KB_VAULT_DIR="${KB_VAULT_DIR:-$HOME/Documents/Claude/knowledge-base/vault}"
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
  log "SYNC: Using LAN ($KB_API_URL)"
else
  log "SYNC: Using WAN ($KB_API_URL)"
fi

# Validate args
if [ $# -lt 1 ]; then
  echo "Usage: kb-sync.sh <vault-relative-path>"
  echo "  e.g.: kb-sync.sh operations/engineering-practice/my-doc.md"
  exit 1
fi

RELATIVE_PATH="$1"

# Validate token
if [ -z "${KB_API_TOKEN:-}" ]; then
  log "ERROR: KB_API_TOKEN is not set"
  exit 1
fi

# Resolve local file
LOCAL_FILE="$KB_VAULT_DIR/$RELATIVE_PATH"
if [ ! -f "$LOCAL_FILE" ]; then
  log "ERROR: File not found: $LOCAL_FILE"
  exit 1
fi

# Read file content and build JSON payload using Python3 (safe for any markdown content)
RESPONSE=$(python3 -c "
import json, sys
with open(sys.argv[1], 'r') as f:
    content = f.read()
payload = json.dumps({'path': sys.argv[2], 'content': content})
print(payload)
" "$LOCAL_FILE" "$RELATIVE_PATH" | curl -s -w "\n%{http_code}" \
  -X POST "$KB_API_URL/api/pages/by-path" \
  -H "Authorization: Bearer $KB_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d @-)

# Split response body and HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  ACTION=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('action','unknown'))" 2>/dev/null || echo "unknown")
  PAGE_ID=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id','?'))" 2>/dev/null || echo "?")
  WARNINGS=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); w=d.get('warnings',[]); print('; '.join(w)) if w else print('')" 2>/dev/null || echo "")

  # Check for multi-device conflict warning
  PREV_UPDATED=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('previous_updated_at',''))" 2>/dev/null || echo "")
  if [ -n "$PREV_UPDATED" ] && [ "$PREV_UPDATED" != "None" ] && [ "$PREV_UPDATED" != "null" ]; then
    LOCAL_MTIME=$(python3 -c "import os,sys; print(os.path.getmtime(sys.argv[1]))" "$LOCAL_FILE" 2>/dev/null || echo "0")
    SERVER_TS=$(python3 -c "
from datetime import datetime
import sys
ts = sys.argv[1].replace('Z','+00:00')
try:
    dt = datetime.fromisoformat(ts)
    print(dt.timestamp())
except:
    print('0')
" "$PREV_UPDATED" 2>/dev/null || echo "0")

    if python3 -c "import sys; sys.exit(0 if float(sys.argv[1]) > float(sys.argv[2]) else 1)" "$SERVER_TS" "$LOCAL_MTIME" 2>/dev/null; then
      log "WARN: Server had a newer version of $RELATIVE_PATH (server: $PREV_UPDATED)"
    fi
  fi

  log "OK: $ACTION $RELATIVE_PATH → page $PAGE_ID"
  if [ -n "$WARNINGS" ]; then
    log "WARN: $WARNINGS"
  fi
else
  ERROR=$(echo "$BODY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('error',sys.stdin))" 2>/dev/null || echo "$BODY")
  log "ERROR: HTTP $HTTP_CODE syncing $RELATIVE_PATH — $ERROR"
  exit 1
fi
