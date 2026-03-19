---
author: claude
order: 10
title: Infrastructure — Overview
---



# Infrastructure — Overview

Everything that runs SS42 — containers, databases, networking, auth, secrets, and deployment. This section answers: **what runs where?**

For the full system picture with Mermaid diagrams, start with [SS42 System Architecture](/page/operations/infrastructure/ss42-system-architecture).

---

## Section Map

### Architecture & Design

| Page | What it covers |
|---|---|
| [SS42 System Architecture](/page/operations/infrastructure/ss42-system-architecture) | Full system architecture with 6 Mermaid diagrams — app topology, databases, network, auth, deployment |
| [Cross-App Auth Architecture](/page/operations/infrastructure/cross-app-auth-architecture) | Google OAuth SSO, shared_auth schema, cookie domain, migration phases |
| [Cross-App Auth Audit](/page/operations/infrastructure/cross-app-auth-audit) | Pre-migration auth audit findings across all apps |

### Containers & Deployment

| Page | What it covers |
|---|---|
| [NAS Containers](/page/operations/infrastructure/nas-containers) | Container inventory — images, ports, IPs, volumes, rebuild commands |
| [Container Verification](/page/operations/infrastructure/container-verification) | Post-deploy health checks for all containers |
| [NAS Deployment Lessons](/page/operations/infrastructure/nas-deployment-lessons) | Lessons learned from NAS container deployments |
| [Staging Verification Playbook](/page/operations/infrastructure/staging-verification-playbook) | Pre-release staging checklist |

### Security & Secrets

| Page | What it covers |
|---|---|
| [Secrets Management](/page/operations/infrastructure/secrets-management) | Credential locations, access patterns, rotation policy |
| [Security Checklist](/page/operations/infrastructure/security-checklist) | Pre-deploy security verification gate |
| [Cloudflare Security](/page/operations/infrastructure/cloudflare-security) | Cloudflare Access, tunnels, DNS configuration |

### Hardware & Backup

| Page | What it covers |
|---|---|
| [NAS Backup Strategy](/page/operations/infrastructure/nas-backup-strategy) | HBS 3 jobs, Google Drive, Synology backup plan |
| [Mac Studio Setup](/page/operations/infrastructure/mac-studio-setup) | Dev machine configuration |
| [Synology NAS](/page/operations/infrastructure/synology-nas) | Synology NAS specs and role |

### Decisions

| Page | What it covers |
|---|---|
| [ADR-002: DB Consolidation](/page/operations/infrastructure/decisions/002-db-consolidation) | Two-database target state — rationale, migration plan |

---

## Related Sections

| Section | Question | Content |
|---|---|---|
| **Infrastructure** (this section) | What runs where? | NAS containers, Cloudflare, auth architecture, deployment runbooks |
| [AI Operating Model](/page/operations/ai-operating-model/overview) | What is the system and where is it going? | Strategy, architecture, governance, decisions |
| [Engineering Practice](/page/operations/engineering-practice/overview) | How do we build and ship? | Build pipeline, session handoff, release process, SDD conventions, skills |
