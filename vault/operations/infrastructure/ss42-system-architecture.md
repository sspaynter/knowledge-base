---
author: claude
order: 20
title: SS42 System Architecture
---



# SS42 System Architecture

Entry point for understanding the SS42 technical platform. All data sourced from the vault articles linked below. For detail on any component, follow the references.

**Source articles:**
- Container inventory: [NAS Containers](/page/operations/infrastructure/nas-containers)
- Auth architecture: [Cross-App Auth Architecture](/page/operations/infrastructure/cross-app-auth-architecture)
- Secrets: [Secrets Management](/page/operations/infrastructure/secrets-management)
- Deployment: [Lifecycle Pattern](/page/operations/engineering-practice/lifecycle-pattern)

---

## 1. Application Topology

Nine containers on a QNAP NAS (192.168.86.18), fronted by Cloudflare Tunnels. Three runtime types: Node/Express applications, static nginx sites, and specialist services.

```mermaid
graph TB
    subgraph Internet
        CF[Cloudflare Tunnels<br/>*.ss-42.com + simonsays42.com]
    end

    subgraph NAS["QNAP NAS (192.168.86.18)"]
        subgraph Apps["Node/Express Applications"]
            KB[knowledge-base<br/>:latest / port 32781<br/>kb.ss-42.com]
            KBS[knowledge-base-staging<br/>:dev / port 32780<br/>kb-staging.ss-42.com]
            AS[applyr-staging<br/>:dev / port 8083<br/>applyr-staging.ss-42.com]
        end

        subgraph Static["Static Nginx Sites"]
            SS[simonsays42-blog<br/>port 8090<br/>simonsays42.com]
            HQ[hq<br/>port 8085<br/>hq.ss-42.com]
            JR[job-review-app<br/>port 8082]
        end

        subgraph Services["Specialist Services"]
            N8N[n8n<br/>port 32777<br/>n8n.ss-42.com]
            NOCO[nocodb<br/>port 32778]
            PG[(n8n-postgres<br/>port 32775)]
        end

        subgraph Infra["Infrastructure"]
            CFD[cloudflared-1<br/>Tunnel daemon]
            WT[watchtower<br/>Image auto-update]
        end
    end

    CF --> CFD
    CFD --> KB & KBS & AS & SS & HQ & N8N

    KB & KBS & AS --> PG
    N8N --> PG
    NOCO --> PG
    JR -.->|NocoDB API| NOCO

    WT -.->|watches :dev + :latest| KB & KBS & AS
```

**Runtime types:**

| Type | Containers | Stack |
|---|---|---|
| Node/Express | knowledge-base, knowledge-base-staging, applyr-staging | Express, PostgreSQL, Passport.js |
| Static nginx | simonsays42-blog, hq, job-review-app | nginx:alpine, static HTML/JS |
| Workflow engine | n8n | n8nio/n8n, PostgreSQL backend |
| Database UI | nocodb | nocodb/nocodb, PostgreSQL |
| Database | n8n-postgres | postgres:16-alpine |

**Not yet containerised:** Applyr production (deployed session 66, not yet in container inventory). ToDo app (planned).

---

## 2. Database Architecture — Current State

A single PostgreSQL instance (`n8n-postgres`) hosts four databases. The `shared_auth` schema in `applyr_staging` creates a cross-database dependency: KB connects to `applyr_staging` via a second connection pool to read auth data.

```mermaid
graph LR
    subgraph PG["n8n-postgres (10.0.3.12:5432)"]
        subgraph DB1["n8n database"]
            N8N_DATA[n8n internal tables]
        end

        subgraph DB2["nocodb database"]
            NOCO_DATA[NocoDB tables<br/>pys9d495uci8hea schema]
            KB_SCHEMA[knowledge_base schema<br/>12 tables]
        end

        subgraph DB3["applyr database"]
            APPLYR_PROD[Applyr production<br/>15 tables]
        end

        subgraph DB4["applyr_staging database"]
            SHARED_AUTH[shared_auth schema<br/>users, sessions,<br/>allowed_emails]
            APPLYR_STG[public schema<br/>15 tables + FKs to shared_auth]
        end
    end

    KB_APP[Knowledge Base app] --> KB_SCHEMA
    KB_APP -.->|sharedAuthPool<br/>cross-DB dependency| SHARED_AUTH
    APPLYR_APP[Applyr staging] --> APPLYR_STG
    APPLYR_APP --> SHARED_AUTH
    N8N_APP[n8n] --> N8N_DATA
    NOCO_APP[NocoDB] --> NOCO_DATA

    style SHARED_AUTH fill:#ff9,stroke:#f90
    style KB_APP fill:#ddf,stroke:#66a
```

**Problem:** Cross-database FK constraints are impossible. KB must maintain a separate `sharedAuthPool` connection to `applyr_staging` for auth queries. This creates operational fragility and deployment coupling.

---

## 3. Database Architecture — Target State

Consolidate to two databases with schema separation. All apps connect to one database per environment. Cross-schema FKs become possible. See [ADR-002](/page/operations/infrastructure/decisions/002-db-consolidation) for rationale and migration plan.

```mermaid
graph LR
    subgraph PG_NEW["n8n-postgres — Target State"]
        subgraph PROD["ss42_production"]
            SA_P[shared_auth.*<br/>users, sessions, allowed_emails]
            AP_P[applyr.*<br/>15 tables]
            KB_P[knowledge_base.*<br/>12 tables]
            TD_P[todo.*<br/>planned]
            SA_P ---|FK| AP_P
            SA_P ---|FK| KB_P
            SA_P ---|FK| TD_P
        end

        subgraph STG["ss42_staging"]
            SA_S[shared_auth.*]
            AP_S[applyr.*]
            KB_S[knowledge_base.*]
            TD_S[todo.*]
            SA_S ---|FK| AP_S
            SA_S ---|FK| KB_S
            SA_S ---|FK| TD_S
        end

        N8N_DB[(n8n database<br/>unchanged)]
    end

    style SA_P fill:#bfb,stroke:#090
    style SA_S fill:#bfb,stroke:#090
```

**Key change:** One `DATABASE_URL` per app per environment. No cross-database pools. FK constraints enforced by PostgreSQL.

---

## 4. Network Topology

All containers run on the Docker `bridge` network. Internal IPs are in the 10.0.3.x range. External access via Cloudflare Tunnels routes through the `cloudflared-1` container.

```mermaid
graph TB
    subgraph External["External Access"]
        USERS[Users / Browser]
        CLAUDE[Claude Code<br/>Mac Studio]
    end

    subgraph CF["Cloudflare"]
        TUNNEL[Tunnel: *.ss-42.com<br/>+ simonsays42.com]
        ACCESS[Cloudflare Access<br/>Google OAuth on hq.ss-42.com]
    end

    subgraph BRIDGE["Docker bridge network (10.0.3.x)"]
        CFD[cloudflared-1]

        PG["n8n-postgres<br/>10.0.3.12<br/>:32775→5432"]
        NOCO["nocodb<br/>10.0.3.14<br/>:32778"]
        KB["knowledge-base<br/>10.0.3.8<br/>:32781→3000"]
        KBS["kb-staging<br/>10.0.3.16<br/>:32780→3000"]
        AS["applyr-staging<br/>:8083→3000"]
        N8N["n8n<br/>:32777"]
        SS["simonsays42<br/>:8090→8080"]
        HQ["hq<br/>:8085→80"]
        JR["job-review-app<br/>:8082→80"]
    end

    USERS --> TUNNEL --> CFD
    CLAUDE -->|LAN: 192.168.86.18| BRIDGE
    CFD --> KB & KBS & AS & N8N & SS & HQ
    ACCESS -.->|protects| HQ
```

**Port assignments:**

| Container | LAN Port | Internal Port | External URL |
|---|---|---|---|
| n8n | 32777 | 5678 | n8n.ss-42.com |
| n8n-postgres | 32775 | 5432 | — (internal only) |
| nocodb | 32778 | 8080 | — (LAN only) |
| knowledge-base | 32781 | 3000 | kb.ss-42.com |
| knowledge-base-staging | 32780 | 3000 | kb-staging.ss-42.com |
| applyr-staging | 8083 | 3000 | applyr-staging.ss-42.com |
| simonsays42-blog | 8090 | 8080 | simonsays42.com |
| hq | 8085 | 80 | hq.ss-42.com |
| job-review-app | 8082 | 80 | — (LAN only) |

---

## 5. Authentication & SSO Flow

Google OAuth with shared PostgreSQL session store. One login works across all `*.ss-42.com` apps. Invite-only via `allowed_emails` table. HQ has an additional Cloudflare Access layer.

```mermaid
sequenceDiagram
    actor User
    participant App as Any SS42 App<br/>(*.ss-42.com)
    participant Google as Google OAuth
    participant Auth as shared_auth schema<br/>(applyr_staging DB)
    participant Session as Session Store<br/>(shared_auth.sessions)

    User->>App: Visit app (no cookie)
    App-->>User: Show "Sign in with Google"
    User->>Google: OAuth consent
    Google->>App: Callback with auth code
    App->>Auth: Check allowed_emails
    Auth-->>App: Email permitted
    App->>Auth: Upsert shared_auth.users
    App->>Session: Create session
    App-->>User: Set cookie: connect.sid<br/>domain=.ss-42.com

    Note over User,Session: SSO — user visits another app

    User->>App: Visit kb.ss-42.com<br/>(cookie sent automatically)
    App->>Session: Read session by cookie
    Session-->>App: User found
    App-->>User: Authenticated — no login prompt
```

**Key components:**

| Component | Detail |
|---|---|
| OAuth provider | Google (one client, multiple redirect URIs) |
| Gate | `shared_auth.allowed_emails` — one row per permitted email |
| Identity | `shared_auth.users` — id, email, google_id, name, avatar_url, is_active |
| Sessions | `shared_auth.sessions` — connect-pg-simple format |
| Cookie | `connect.sid` on `.ss-42.com`, HttpOnly, secure, sameSite: lax, 30-day expiry |
| Session secret | `/share/Container/shared-secrets.env` on NAS — must match across all apps |
| API auth | Separate Bearer token system per app (not session-based) |
| HQ protection | Cloudflare Access (Google OAuth) — independent of app-level auth |

---

## 6. Deployment Pipeline

Git push triggers CI/CD. GitHub Actions builds Docker images, pushes to GHCR. Watchtower on the NAS detects new images and auto-deploys.

```mermaid
graph LR
    subgraph Dev["Developer (Mac Studio)"]
        CODE[Code changes]
    end

    subgraph GH["GitHub"]
        DEV_BRANCH[dev branch]
        MAIN_BRANCH[main branch]
        ACTIONS[GitHub Actions]
        GHCR[GHCR Registry]
    end

    subgraph NAS["QNAP NAS"]
        WT[Watchtower<br/>polls every 5 min]
        STG[Staging container<br/>:dev tag]
        PROD[Production container<br/>:latest tag]
    end

    CODE -->|git push| DEV_BRANCH
    DEV_BRANCH -->|CI trigger| ACTIONS
    ACTIONS -->|build + push :dev| GHCR
    GHCR -->|detected by| WT
    WT -->|pull + restart| STG

    CODE -->|merge dev→main| MAIN_BRANCH
    MAIN_BRANCH -->|CI trigger| ACTIONS
    ACTIONS -->|build + push :latest| GHCR
    WT -->|pull + restart| PROD

    style STG fill:#ffd,stroke:#aa0
    style PROD fill:#dfd,stroke:#0a0
```

**Branch rules:**

| Branch | Image tag | Environment | Deploy method |
|---|---|---|---|
| `dev` | `:dev` | Staging | Auto (Watchtower) |
| `main` | `:latest` | Production | Auto (Watchtower) |

**Exception:** SimonSays42 uses local Docker builds (Hugo multi-stage) — no CI/CD, manual `rsync` + `rebuild.sh` on NAS.

**Release process:** Managed by the `lifecycle:release` skill. Pre-flight checks → commit analysis → version recommendation → confirmation gate → merge, tag, push, GitHub Release, CHANGELOG, KB vault release page. See [Lifecycle Pattern](/page/operations/engineering-practice/lifecycle-pattern).

---

## Infrastructure Roadmap

| Status | Items |
|---|---|
| **Live** | n8n, n8n-postgres, nocodb, job-review-app, knowledge-base (prod + staging), applyr-staging, simonsays42-blog, hq, cloudflared-1, watchtower |
| **Next** | DB consolidation (#210/#208), NAS backup setup (#174), container timezone standardisation (#51) |
| **Planned** | Umami analytics, Dev Platform (Mac Studio containers), ToDo app, Applyr production container inventory update |

---

## References

- [NAS Containers](/page/operations/infrastructure/nas-containers) — authoritative container inventory
- [Cross-App Auth Architecture](/page/operations/infrastructure/cross-app-auth-architecture) — SSO design and migration status
- [Secrets Management](/page/operations/infrastructure/secrets-management) — credential locations and access patterns
- [Lifecycle Pattern](/page/operations/engineering-practice/lifecycle-pattern) — branching, versioning, deployment
- [Staging Verification Playbook](/page/operations/infrastructure/staging-verification-playbook) — pre-release checklist
- [Cloudflare Security](/page/operations/infrastructure/cloudflare-security) — tunnel and Access configuration
