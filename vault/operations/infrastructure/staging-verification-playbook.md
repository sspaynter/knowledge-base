---
author: both
order: 110
title: Staging Verification Playbook
---



# Staging Verification Playbook

How to verify SS42 web apps on staging when browser-based testing is not available (Google OAuth blocks CDP-controlled browsers).

## The Problem

Claude Code cannot authenticate to staging apps through the Chrome DevTools MCP because Google detects Chrome DevTools Protocol connections and blocks OAuth sign-in. See `operations/engineering-practice/chrome-devtools-mcp-auth.md` for the full analysis.

## API Verification Pattern

Verify staging functionality directly via API calls using a session cookie extracted from the database.

### Step 1: Get a valid session ID

Connect to the staging database and query the sessions table:

```bash
psql "postgresql://<user>:<pass>@192.168.86.18:32775/applyr_staging" \
  -c "SELECT sid, sess->>'passport' as passport FROM shared_auth.sessions WHERE expire > NOW() LIMIT 5;"
```

Pick a session that has a populated `passport` field (contains the authenticated user ID).

### Step 2: Sign the session cookie

Express-session cookies use the format `s:<session-id>.<hmac-sha256-signature>`. To sign:

```bash
# Get the SESSION_SECRET from the container
SESSION_SECRET=$(ssh nas "cat /share/Container/shared-secrets.env" | grep SESSION_SECRET | cut -d= -f2-)

# Sign the session ID (Node.js one-liner)
SID="<session-id-from-step-1>"
SIGNED=$(node -e "
const crypto = require('crypto');
const sig = crypto.createHmac('sha256', '${SESSION_SECRET}').update('${SID}').digest('base64').replace(/=+$/, '');
console.log('s%3A${SID}.' + sig);
")
```

### Step 3: Make authenticated API calls

```bash
# Verify authentication
curl -s -b "connect.sid=$SIGNED" https://applyr-staging.ss-42.com/auth/me | jq .

# Test specific endpoints
curl -s -b "connect.sid=$SIGNED" https://applyr-staging.ss-42.com/api/v1/jobs | jq '.data | length'
curl -s -b "connect.sid=$SIGNED" https://applyr-staging.ss-42.com/api/v1/jobs/1 | jq '.data.company'
```

### Step 4: Verify all MVP areas

Run through each functional area via API:

| Area | Endpoint | What to check |
|---|---|---|
| Auth | `GET /auth/me` | Returns 200 with user object |
| Jobs list | `GET /api/v1/jobs` | Returns jobs array with pagination |
| Job detail | `GET /api/v1/jobs/:id` | Returns full job with all fields |
| Job scores | `GET /api/v1/jobs/:id/scores` | Returns scoring data |
| Cover letters | `GET /api/v1/jobs/:id/cover-letter` | Returns cover letter content |
| Resume tailoring | `GET /api/v1/jobs/:id/resume` | Returns tailoring suggestions |
| Resume export | `GET /api/v1/jobs/:id/resume/export` | Returns DOCX file (check Content-Type and size) |
| Company research | `GET /api/v1/jobs/:id/research` | Returns research content |
| Application questions | `GET /api/v1/jobs/:id/questions` | Returns Q&A data |
| Notifications | `GET /api/v1/notifications` | Returns notification list |
| User settings | `GET /api/v1/settings` | Returns user config |

### Step 5: Visual verification (manual)

For UI rendering checks that cannot be done via API, ask the user to:

1. Open the staging URL in a normal browser
2. Navigate to each view
3. Take screenshots for review

## Alternative: Staging Auth Bypass

Once MASTER-TODO #124 is implemented, staging will have a `GET /auth/dev-login?token=<DEV_LOGIN_TOKEN>` endpoint that creates a valid session without Google OAuth. This eliminates the need for database cookie extraction.

## Applies To

Any SS42 app behind Google OAuth on staging:
- Applyr: `applyr-staging.ss-42.com`
- Knowledge Base: `kb-staging.ss-42.com` (when staging exists)
- Future apps on `.ss-42.com` SSO domain
