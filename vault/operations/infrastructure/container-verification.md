---
title: Container Verification
status: published
author: both
created: 2026-03-05
updated: 2026-03-05
---

# Container Verification

How to check what is running inside NAS containers. Two approaches depending on what you are verifying.

## Internal Verification (Default)

SSH into the NAS and query containers directly. No Cloudflare Access auth needed. Use this for routine checks — version, health, endpoint responses.

### Check container version

```bash
DOCKER=/share/CACHEDEV2_DATA/.qpkg/container-station/usr/bin/docker

# Read package.json version
ssh nas "$DOCKER exec {container} node -e \"console.log(require('./package.json').version)\""

# Hit an internal API endpoint
ssh nas "$DOCKER exec {container} wget -qO- http://127.0.0.1:3000/api/version"
```

### Check container status

```bash
ssh nas "$DOCKER ps --filter name={container} --format '{{.Names}} {{.Image}} {{.Status}}'"
```

### When to use

- Confirming a deploy landed (version matches expected)
- Checking container health after restart
- Debugging internal endpoint responses
- Any time you need to know what the container is actually running

## External Verification

Use curl to hit the public URL through Cloudflare. This tests the full path: DNS, tunnel, Cloudflare Access, container.

```bash
curl -s https://{subdomain}.ss-42.com/api/version
```

### When to use

- Confirming end-to-end public access works
- Verifying Cloudflare tunnel routing after config changes
- Testing Cloudflare Access bypass rules
- Checking what users see from outside the network

### Gotcha

Public endpoints behind Cloudflare Access return 302 (redirect to login) unless the path has a bypass rule. A 302 does not mean the container is down — it means auth is blocking the request.

## Convention

**Default to internal.** It is faster, requires no Cloudflare config, and tells you exactly what the container is running. Use external only when you specifically need to verify the public path.
