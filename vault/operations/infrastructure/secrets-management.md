---
author: both
order: 90
title: Secrets Management Policy
---



# Secrets Management Policy

Where credentials live, how they are accessed, and what must never appear in documentation, skills, or memory files.

## Canonical Secret Locations

| Secret | Location | Accessed by |
|---|---|---|
| SESSION_SECRET | `/share/Container/shared-secrets.env` on NAS | All SS42 web apps via `env_file` mount |
| GOOGLE_CLIENT_SECRET | `/share/Container/shared-secrets.env` on NAS | All apps using Google OAuth |
| INGEST_SECRET | `/share/Container/shared-secrets.env` on NAS | Applyr + n8n ingest workflows |
| ANTHROPIC_API_KEY | `/share/Container/shared-secrets.env` on NAS | Apps needing Claude API |
| CF_API_TOKEN | `/share/Container/shared-secrets.env` on NAS | Claude Code sessions managing Cloudflare tunnels, DNS, Access apps |
| NOCODB_API_TOKEN | `/share/Container/shared-secrets.env` on NAS | Claude Code sessions querying NocoDB API |
| POSTGRES_PASSWORD | `/share/Container/shared-secrets.env` on NAS | Containers + Claude Code sessions connecting to PostgreSQL |
| Database credentials | Container `DATABASE_URL` env var | Set per-container in Container Station |
| n8n API key | `~/.config/n8n/api-key` on dev Mac | Claude Code scripts, n8n REST API calls |
| KB API token | `KB_API_TOKEN` env var on dev Mac | `kb-sync.sh`, `kb-pull.sh` scripts |
| Google OAuth Client ID | Container env var `GOOGLE_CLIENT_ID` | All apps using Google OAuth |
| DEV_LOGIN_TOKEN | Container env var (staging only) | Staging auth bypass for automated testing |

## Rules

### What goes in documentation

- **Allowed:** Secret names, env var names, file paths where secrets are stored, access patterns, which containers need which secrets
- **Allowed:** Redacted examples — `DATABASE_URL=postgresql://user:****@host:port/db`
- **Never:** Actual passwords, API keys, connection strings with real credentials, session secrets

### What goes in CLAUDE.md and skills

- Reference the location: "Database credentials are in the container's `DATABASE_URL` env var"
- Reference the access pattern: "n8n API key is read from `~/.config/n8n/api-key`"
- Never embed actual values

### What goes in MEMORY.md

- Access patterns and file paths
- Port numbers, hostnames, database names
- Never actual credential values
- If credentials were discovered during a session, record WHERE they are stored, not WHAT they contain

### What goes in KB vault articles

- Architecture descriptions reference secret names and locations
- Security checklists reference what must be set, not what the values are
- Audit logs may note "credential X was rotated" but never the old or new value

## Retrieving Credentials at Runtime

Claude Code sessions that need credentials follow this pattern:

1. **Env var on dev Mac:** Check with `echo $VAR_NAME` — works for `KB_API_TOKEN`, n8n API key
2. **NAS container env:** SSH to NAS, run `docker inspect <container> --format '{{range .Config.Env}}{{println .}}{{end}}'`
3. **shared-secrets.env:** SSH to NAS, read `/share/Container/shared-secrets.env`
4. **Database query:** Connect via `psql` using the `DATABASE_URL` from step 2

Never cache retrieved credentials in files, memory, or conversation history beyond the immediate use.

## Shared Secrets File

`/share/Container/shared-secrets.env` on the NAS is the single source of truth for secrets shared across multiple containers. Format:

```
SESSION_SECRET=<value>
GOOGLE_CLIENT_SECRET=<value>
ANTHROPIC_API_KEY=<value>
INGEST_SECRET=<value>
CF_API_TOKEN=<value>
NOCODB_API_TOKEN=<value>
POSTGRES_PASSWORD=<value>
```

This file stores ALL secrets — container runtime secrets, API tokens, database credentials, and tokens used by Claude Code sessions on the Mac. Containers reference it via `env_file` in their Docker configuration. All apps sharing SSO must use the same `SESSION_SECRET` value from this file.

## Credential Rotation

When rotating a secret:

1. Update the value in its canonical location (shared-secrets.env or container env)
2. Restart affected containers
3. Verify all dependent services still authenticate
4. Do not update documentation with new values — documentation references locations, not values

## Related

- Security checklist: `operations/infrastructure/security-checklist.md`
- Secrets management cleanup task: MASTER-TODO #30
- Infrastructure context skill: `~/.claude/skills/infra-context/SKILL.md`
