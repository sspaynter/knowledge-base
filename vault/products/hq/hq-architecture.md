---
title: SS42 HQ — Architecture
status: published
order: 20
author: claude
created: 2026-03-12
updated: 2026-03-12
---

# SS42 HQ — Architecture

## Stack

HQ is a static file server. There is no application backend, no database, and no build step.

| Layer | Technology | Detail |
|---|---|---|
| File storage | NAS volume | `/share/CACHEDEV1_DATA/Container/web-apps/hq/` |
| Web server | nginx:alpine | Container `hq`, port 8085 → 80 |
| External access | Cloudflare Tunnel | Via existing `cloudflared-1` container |
| Authentication | Cloudflare Access | Google OAuth, personal account only |
| Domain | `hq.ss-42.com` | Cloudflare DNS A record → tunnel |

## NAS folder structure

```
/share/CACHEDEV1_DATA/Container/web-apps/hq/
├── index.html           ← HQ homepage (links to all content)
├── plans/
│   └── item-lifecycle-flow.html
├── prototypes/
│   └── todo-prototype-v2.html
└── builds/
    └── (future)
```

nginx serves this directory as-is. Folder structure maps directly to URL paths.

## nginx container

Deployed using the same pattern as `job-review-app`:

```bash
docker run -d \
  --name hq \
  --network bridge \
  --restart unless-stopped \
  -v /share/CACHEDEV1_DATA/Container/web-apps/hq:/usr/share/nginx/html:ro \
  -p 8085:80 \
  nginx:alpine
```

Read-only volume mount. nginx serves files with no write access to the volume from inside the container.

## Cloudflare tunnel configuration

The existing `cloudflared-1` container manages all Cloudflare tunnels. To add HQ, a new ingress rule is added to the cloudflared config pointing `hq.ss-42.com` to `http://localhost:8085`.

No new container needed. No new tunnel needed.

## Authentication — Cloudflare Access

Cloudflare Access sits in front of `hq.ss-42.com` at the Cloudflare network edge. Requests are intercepted before reaching the NAS. Authentication flow:

1. User visits `hq.ss-42.com`
2. Cloudflare Access intercepts → redirects to Google OAuth
3. Google authenticates → returns identity to Cloudflare
4. Cloudflare evaluates the Access policy (email allowlist: your Google account)
5. If allowed → issues a `CF_Authorization` JWT cookie → request passes to nginx
6. nginx serves the requested file

The nginx container never sees unauthenticated requests. This is handled entirely at the edge.

## Adding content

To add a new file to HQ:

```bash
scp /path/to/file.html nas:/share/CACHEDEV1_DATA/Container/web-apps/hq/plans/
```

No container restart. No cache to clear. The file is available at `hq.ss-42.com/plans/file.html` immediately.

## Future: shared_auth migration

The KB Staging and Applyr Staging containers share a `shared_auth` PostgreSQL schema and use `.ss-42.com` cookie domain for SSO. When that pattern matures, HQ should participate in the same session cookie rather than maintaining a separate Cloudflare Access gate.

Migration path: deploy a lightweight Node.js auth middleware in front of nginx (or switch to a small Express static server), connect to `shared_auth`, and remove the Cloudflare Access policy.

This is not a priority until shared_auth is stable across all tools.

