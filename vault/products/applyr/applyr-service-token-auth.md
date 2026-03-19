---
author: claude
order: 90
status: draft
title: Applyr — Service Token Auth Design Note
---



# Applyr — Service Token Auth Design Note

**Status:** Design note — not yet implemented. Tracked as MASTER-TODO #116 (seq A26).

**Pre-requisite:** Applyr Update Agent Sprint (#105–#113) complete.

This document captures the problem, proposed solution, and implementation scope for adding service token authentication to Applyr's API. Required so Claude Code agents running in a terminal session can make authenticated API calls without a browser session.

---

## The Problem

Applyr's session-protected API endpoints use `requireUser` middleware. This middleware checks for a valid browser session cookie. If no session is present, the request is rejected with 401.

Claude Code agents (discovery-agent, application-agent, followup-agent) run inside a terminal Claude Code session. They cannot:
- Maintain a browser session cookie
- Log in via the OAuth flow
- Access any endpoint protected by `requireUser`

This means agents cannot currently call:
- `POST /api/v1/jobs/:id/cover-letter/generate`
- `POST /api/v1/jobs/:id/research`
- `POST /api/v1/jobs/:id/resume/generate`
- `GET /api/v1/jobs` (read job list)
- Any other route behind `requireUser`

The automated n8n layer is already solved — it uses `webhookAuth` middleware with a shared secret header (`X-Webhook-Secret`). Claude Code agents need an equivalent.

---

## Proposed Solution

Extend `requireUser` middleware to check for an `X-Service-Token` header before falling back to session auth.

### Logic (pseudocode)

```
function requireUser(req, res, next) {
    // Check service token first
    if (req.headers['x-service-token']) {
        if (req.headers['x-service-token'] === process.env.SERVICE_TOKEN) {
            req.serviceAuth = true   // flag for downstream logging
            return next()
        }
        return res.status(401).json({ error: 'Invalid service token' })
    }

    // Fall back to session auth
    if (!req.session?.userId) {
        return res.status(401).json({ error: 'Unauthorised' })
    }
    next()
}
```

If the header is present and matches, the request proceeds with service-level access. If the header is present but wrong, fail fast — do not fall through to session auth. If the header is absent, existing session behaviour is unchanged.

---

## Implementation Scope

| Component | Change |
|---|---|
| `server/middleware/auth.js` | Extend `requireUser` to check `X-Service-Token` header |
| `shared-secrets.env` (NAS) | Add `SERVICE_TOKEN=<generated secret>` |
| Applyr env config | Add `SERVICE_TOKEN` to container environment |
| Agent definitions (#106–#109) | Pass `X-Service-Token` header on all Applyr API calls |
| `job-app/CLAUDE.md` | Document that agents use service token auth |

**No changes to:**
- Database schema
- API route definitions
- Frontend code
- n8n workflows (they use their own `webhookAuth`)

---

## Security Considerations

**Token storage:**
- `SERVICE_TOKEN` lives in `shared-secrets.env` on the NAS alongside other secrets
- Never committed to git
- Mounted into the Applyr container via `env_file`
- Agents read it from a local `.env` file or environment variable in the terminal session

**Access level:**
- Service token grants full read/write access to all `requireUser` routes
- No user-id scoping — it is a trusted internal caller
- Treat it like a root service credential — rotate if compromised

**Logging:**
- Flag `req.serviceAuth = true` so service-token requests are distinguishable in logs from user session requests
- Do not log the token value itself

**Attack surface:**
- Token is only usable from a caller that knows it — no benefit to an attacker who cannot read `shared-secrets.env`
- HTTPS-only deployment (Cloudflare tunnel) means the header is encrypted in transit
- Not exposed in any frontend code or public API

---

## Activation Sequence

When implementing #116:

1. Generate a strong random secret (`openssl rand -hex 32`)
2. Add `SERVICE_TOKEN=<value>` to `shared-secrets.env` on NAS
3. Update Applyr `docker-compose.yml` to pass `SERVICE_TOKEN` via `env_file` or explicit env var
4. Extend `requireUser` middleware per the pseudocode above
5. Add tests: service token accepted, wrong token rejected, no token falls to session auth
6. Update agent definitions to pass header on API calls
7. Restart Applyr container and verify end-to-end: agent → API call → authenticated

---

## Why Not Earlier

This consideration was raised during the Applyr Update Agent Sprint design (session 63, 2026-03-11). The sprint (#105–#113) is entirely `.claude/` config changes — agent and skill definitions. No app code changes.

The service token fix requires an app code change. It was deliberately deferred so it does not:
1. Block the Claude Code architecture refactor
2. Mix infrastructure changes with config file changes
3. Add scope to the MVP stabilisation phase

Once the agent sprint is complete and agents are actively calling the Applyr API, the lack of service token auth will surface as a concrete blocker. At that point, #116 becomes a P1 task, not a design consideration.

---

## Related Documents

- MASTER-TODO: #116 (seq A26) — service token auth
- [Applyr — Claude Code Architecture](/page/products/applyr/applyr-claude-code-architecture)
- [Applyr — Update Agent Sprint](/page/products/applyr/applyr-update-agent-sprint)
- [SS42 Agent Architecture Standard](/page/operations/ai-operating-model/architecture)
