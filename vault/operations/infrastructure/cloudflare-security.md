---
author: both
order: 100
title: Cloudflare Security — Access, Rate Limiting, and Webhook Protection
updated: 2026-03-19
---



# Cloudflare Security — Access, Rate Limiting, and Webhook Protection

## Overview

All SS42 services are behind Cloudflare Tunnel (outbound-only, no ports exposed to internet). Cloudflare provides DNS, SSL/TLS, CDN, WAF, and DDoS protection on the free plan. This article documents the additional security layers configured on top of the default Cloudflare protections.

## Cloudflare Access — Application Protection

Cloudflare Access adds authentication to public-facing services. Visitors must authenticate before reaching the application.

### Current Access Applications

| App | Domain | Purpose | Auth method |
|---|---|---|---|
| n8n | `n8n.ss-42.com` | Workflow automation dashboard | Cloudflare Access login |
| Knowledge Base | `kb.ss-42.com` | KB web app dashboard | Cloudflare Access login |
| KB API Bypass | `kb.ss-42.com/api` | API access without login | Bypass (everyone) |
| n8n Webhook Bypass | `n8n.ss-42.com/webhook` | Webhook endpoints without login | Bypass (everyone) |
| SS42 HQ | `hq.ss-42.com` | Internal hub | Cloudflare Access login |
| Lifeboard | `lifeboard.ss-42.com` | Kanban board | Cloudflare Access login |
| SSA Staging | `ssa-staging.ss-42.com` | SSA website staging environment | Email OTP (Simon only) |

### Staging Environment Access Pattern

All staging sites should be behind Cloudflare Access to prevent public exposure of pre-release content and internal infrastructure details (staging URLs, debug output, test data).

**Standard policy:** Email OTP restricted to `paynter.simon@gmail.com`. Session duration: 24 hours.

**Current staging sites:**

| Staging site | Access protected | App-level auth | Notes |
|---|---|---|---|
| `ssa-staging.ss-42.com` | Yes (email OTP) | None (static site) | Cloudflare Access is the only gate |
| `kb-staging.ss-42.com` | No | Google login | App UI visible but data requires authentication |
| `applyr-staging.ss-42.com` | No | Google login | App UI visible but data requires authentication |

**When to require Cloudflare Access on staging:** Always add it for static sites and any app without its own authentication. Apps with Google login are lower priority — the login screen is visible but functionality is gated. Adding Access to those is optional but recommended to avoid exposing staging UI or pre-release features.

When creating a new staging container, add Cloudflare Access as part of the setup — not as a follow-up task.

**API call to create staging Access app:**
```bash
eval "$(ssh nas 'cat /share/Container/shared-secrets.env' | grep '^CF_')"
ACCOUNT_ID="722ec3ccd21b7b067b6a75a679b4bbf0"

# Create app
APP_ID=$(curl -s -X POST \
  -H "X-Auth-Email: $CF_AUTH_EMAIL" \
  -H "X-Auth-Key: $CF_GLOBAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "{Name} Staging", "domain": "{name}-staging.ss-42.com", "type": "self_hosted", "session_duration": "24h"}' \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/access/apps" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['id'])")

# Create email OTP policy
curl -s -X POST \
  -H "X-Auth-Email: $CF_AUTH_EMAIL" \
  -H "X-Auth-Key: $CF_GLOBAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "Allow Simon (email OTP)", "decision": "allow", "include": [{"email": {"email": "paynter.simon@gmail.com"}}], "precedence": 1}' \
  "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/access/apps/$APP_ID/policies"
```

### Access Bypass Pattern

Some services need specific paths accessible without authentication — APIs called by external tools, and webhook endpoints that receive data from public-facing forms.

**Pattern:** Create a second Access application scoped to the specific path (e.g. `/api` or `/webhook`), with a bypass policy that includes "everyone." Cloudflare evaluates path-specific rules before domain-wide rules, so the bypass takes priority for matching paths.

**Key settings:**
- `app_launcher_visible: false` — bypass apps do not appear in the Access launcher
- `options_preflight_bypass: true` — required for CORS. When a browser sends `Content-Type: application/json`, it sends an OPTIONS preflight request first. Without this setting, Cloudflare Access blocks the preflight and the actual request never fires.

**Security of bypassed paths:**

| Bypass | What it exposes | Application-level protection |
|---|---|---|
| `kb.ss-42.com/api` | KB REST API endpoints | `KB_API_TOKEN` Bearer auth on all endpoints except `/api/health` and `/api/version` |
| `n8n.ss-42.com/webhook` | n8n webhook trigger endpoints only | Honeypot field validation, Cloudflare rate limiting, workflow-level input validation |

Bypassed paths do not expose application UIs, admin panels, credential stores, or workflow editors. The bypass lets requests reach the application — the application must still validate and authenticate them.

### When to Create a Bypass

Create a bypass when:
1. External systems need to call an endpoint programmatically (APIs, webhooks)
2. Browser-based forms submit cross-origin via JavaScript fetch
3. The application has its own authentication layer for the exposed path

Do not bypass:
1. Admin panels or dashboard UIs
2. Paths that expose stored data without their own auth
3. Endpoints that modify application state without auth tokens

## Rate Limiting

### Free Plan Constraints

Cloudflare free plan allows:
- **1 rate limiting rule** per zone
- **10-second period only** (no longer windows)
- Rate limiting is per-colo (Cloudflare data centre), not global

### Current Rate Limiting Rules

| Zone | Rule | Expression | Limit | Block duration |
|---|---|---|---|---|
| `ss-42.com` | Contact form webhook | `POST` to `n8n.ss-42.com/webhook/contact` | 3 reqs per 10s per IP | 10 seconds |

**Decision (session 6):** The default Cloudflare leaked-credential-check rule was replaced with the contact form rate limiter. Rationale: all SS42 services use Google OAuth (not password-based login), so leaked credential checking is irrelevant to the authentication model. The webhook rate limiter provides more practical protection.

### What the Rate Limiter Does Not Cover

- **Long-window abuse** — someone sending 1 request every 5 seconds would not trigger the 3/10s limit. The honeypot field is the primary defence against automated spam.
- **Distributed attacks** — rate limiting is per-IP. A botnet using many IPs would bypass it. Cloudflare's built-in DDoS protection (always-on, free tier) handles volumetric attacks.
- **Other webhook endpoints** — only the contact form webhook is rate-limited. If new webhooks are added, they need their own protection (or the rule expression needs broadening).

## Webhook Security Pattern

When exposing an n8n webhook endpoint to the public internet:

1. **Cloudflare Access bypass** — path-scoped Access app with bypass policy and `options_preflight_bypass: true`
2. **Cloudflare rate limiting** — add to the zone rate limiting rule (free plan: 1 rule total, combine with OR expressions if multiple webhooks)
3. **Honeypot field** — hidden form field that bots auto-fill; workflow rejects any submission where it has a value
4. **Application-level validation** — n8n workflow validates required fields and rejects malformed input
5. **CORS restriction** — webhook `allowedOrigins` set to the specific domain that hosts the form

### Webhook Security Checklist

- [ ] Access bypass app created for `/webhook` path (not broader)
- [ ] `options_preflight_bypass: true` set on the bypass app
- [ ] Rate limiting rule covers the webhook endpoint
- [ ] Honeypot field in the form, validated in the workflow
- [ ] Required field validation in the workflow (reject empty name/email/message)
- [ ] Webhook `allowedOrigins` set to the origin domain
- [ ] Response does not leak internal data (return success/error only)
- [ ] Gmail/notification credential verified working

## Cloudflare API Access

API credentials are stored in `/share/Container/shared-secrets.env` on the NAS.

| Credential | Scope | Usage |
|---|---|---|
| `CF_API_TOKEN` | Tunnel Edit, DNS Edit, Access Apps Edit | Most Cloudflare operations |
| `CF_GLOBAL_API_KEY` + `CF_AUTH_EMAIL` | Full account access | Tunnel config, DNS records, Access apps, zone-level operations |

**Note:** `CF_API_TOKEN` lacks account-level scope for tunnel configuration. Use `CF_GLOBAL_API_KEY` + `CF_AUTH_EMAIL` for tunnel ingress rules, DNS record creation, and Access app management.

Load credentials for a session:
```bash
eval "$(ssh nas 'cat /share/Container/shared-secrets.env' | grep '^CF_')"
```

## n8n API Access

The n8n REST API is used by Claude Code sessions to create, update, and manage workflows.

| Detail | Value |
|---|---|
| Base URL | `http://192.168.86.18:32777/api/v1/` |
| Auth header | `X-N8N-API-KEY: {key}` |
| API key location | `~/.config/n8n/api-key` on Mac |
| Key label in n8n | "Claude Code" (never expires) |

Load the key in a session:
```bash
N8N_API_KEY=$(cat ~/.config/n8n/api-key)
```

## Related Documentation

- Security checklist: `operations/infrastructure/security-checklist.md`
- Secrets management: `operations/infrastructure/secrets-management.md`
- NAS container inventory: `operations/infrastructure/nas-containers.md`
- Cross-app auth architecture: `operations/infrastructure/cross-app-auth-architecture.md`
