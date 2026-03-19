---
title: Governance
status: published
author: both
parent: overview
created: 2026-03-14
updated: 2026-03-14
---

# Governance

This page documents the governance policies that apply to the SS42 AI Operating Model. It states what the rules are — not how to execute them. Implementation detail lives in the infrastructure articles referenced throughout.

---

## Data Sovereignty

### What leaves the network

Every Claude API call sends conversation context to Anthropic. This includes code snippets, file contents, vault text, plan files, and session instructions. The Anthropic privacy policy states that API inputs and outputs are not used for model training unless explicitly opted in.

n8n automation workflows call Claude Haiku and Sonnet via the Anthropic API. These calls send job descriptions, scoring prompts, and evaluation criteria.

No other data leaves the local network. There is no telemetry, no analytics service, no third-party logging.

### What stays local

| Data | Location |
|---|---|
| PostgreSQL databases (all app data, user records, sessions) | QNAP NAS container `n8n-postgres` |
| KB vault files | QNAP NAS volume + local Mac clone |
| Container volumes (app data, n8n workflows) | QNAP NAS `/share/Container/` |
| Session logs, MEMORY.md, topic files | Local Mac `~/.claude/` |
| Git repositories | Local Mac + GitHub (private repos) |
| Uploaded files (resumes, cover letters) | QNAP NAS container volumes |

GitHub repositories are private. Source code is on GitHub servers but not publicly accessible.

---

## Secrets Policy

Secrets have three rules:

1. **One canonical location per secret.** Shared secrets live in `/share/Container/shared-secrets.env` on the NAS. Per-container secrets live in container environment variables. Mac-side tokens live in `~/.config/` or shell environment variables.

2. **Documentation references locations, never values.** CLAUDE.md files, skills, MEMORY.md, and KB vault articles may name a secret and state where it is stored. They must never contain the actual credential value.

3. **Rotation requires restart.** When a secret changes in `shared-secrets.env`, all containers that mount that file must be restarted. Dependent services must be verified post-rotation.

Full implementation detail: [Secrets Management Policy](/page/operations/infrastructure/secrets-management)

---

## Access Control

### Application access

All SS42 web applications use Google OAuth SSO via a shared authentication layer:

- Single Google OAuth client across all apps
- Shared `allowed_emails` table gates access — invite-only, no public registration
- Shared `users` and `sessions` tables in the `shared_auth` PostgreSQL schema
- Cookie scoped to `.ss-42.com` enables single sign-on across all subdomains
- `is_active` flag on the user record is checked on every request — setting it to `false` instantly revokes access across all apps

Adding a user: one `INSERT` into `shared_auth.allowed_emails`. Removing a user: `DELETE` from `allowed_emails` + set `is_active = false`.

Full implementation detail: [Cross-App Auth Architecture](/page/operations/infrastructure/cross-app-auth-architecture)

### Network access

All `*.ss-42.com` subdomains are behind Cloudflare Tunnel. No ports are open on the home network. Cloudflare Access enforces Google authentication at the network edge before requests reach the application layer.

### API access

KB and Applyr expose API endpoints authenticated via Bearer tokens. API tokens are separate from session cookies and do not travel in browser requests. The KB API token is used by `kb-sync.sh` and `kb-pull.sh` for vault synchronisation.

---

## Agent Boundaries

Two governance controls constrain agent behaviour:

### Cross-project modification boundary

Every Claude Code session has a declared active project. Agents must not modify application code, push git commits, restart containers, or change databases in any project other than the active one. If a bug is found in another project, it is logged in the MASTER-TODO — not fixed.

This rule is enforced declaratively in `~/.claude/CLAUDE.md` and read by every session.

### Agent guardrails framework

Five guardrail types govern agent behaviour between human checkpoints:

| Type | What it controls |
|---|---|
| Scope | Which API endpoints and resources each agent may access |
| Action | Which operations require human confirmation vs proceed autonomously |
| Gate | When agents must stop and wait for human instruction |
| Data | How agents handle persistent writes, idempotency, and error escalation |
| Layer | Different rules for interactive (Claude Code) vs automated (n8n) execution |

Three enforcement mechanisms: architecture constraints (structurally impossible), declarative rules (CLAUDE.md and agent definitions), and review gates (explicit stop conditions in workflow agents).

Full framework: [Agent Guardrails](/page/operations/ai-operating-model/agent-guardrails)

---

## Client Data Handling

Not yet defined. No client engagements are active. The following principles are stated for when this becomes relevant:

- Client data must live in isolated environments (cloud, not personal NAS)
- Separate credentials per client engagement
- Client data must never be mixed with personal project data
- Data retention policy defined per engagement before work begins
- Claude API calls containing client data require explicit client awareness that data is sent to Anthropic

This section will be expanded when client work begins.

---

## Security Verification

A pre-deployment security checklist exists and must be completed before any app is deployed to staging or production. It covers authentication, secrets, cookies, session store, rate limiting, headers, database queries, static file serving, input/output handling, and SSO-specific concerns.

Full checklist: [Security Checklist](/page/operations/infrastructure/security-checklist)

---

## What Governance Does Not Cover

- **Claude Code runtime safety** — enforced by the Claude Code system itself, not configurable by governance policy
- **Application-level security** (SQL injection, XSS, CSRF) — covered by the security checklist and code-quality skill, not this document
- **Infrastructure operations** (container management, DNS, tunnels) — covered by infrastructure runbooks
- **n8n workflow credentials** — managed within n8n's credential store, covered by NAS deployment playbooks

---

## Related

- [AI Operating Model — Overview](/page/operations/ai-operating-model/overview)
- [Agent Guardrails](/page/operations/ai-operating-model/agent-guardrails)
- [Secrets Management Policy](/page/operations/infrastructure/secrets-management)
- [Cross-App Auth Architecture](/page/operations/infrastructure/cross-app-auth-architecture)
- [Security Checklist](/page/operations/infrastructure/security-checklist)
