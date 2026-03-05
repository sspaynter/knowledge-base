---
title: Mac Studio Setup
status: draft
author: both
created: 2026-03-05
updated: 2026-03-05
---

# Mac Studio Setup

Configuration guide for the Mac Studio as an always-on development server.

## Hardware

- **Model:** Mac Studio M1
- **RAM:** 64 GB
- **Role:** Always-on development server running the Dev Server process and Claude Code workers
- **Network:** LAN at 192.168.86.x (same network as NAS)

## macOS configuration

### Always-on settings
- System Settings > Energy: Enable "Prevent automatic sleeping"
- Display sleep: Disabled or set to long interval (machine must stay awake for scheduled tasks)
- Automatic login: Configure if desired (optional — SSH access does not require login)

### Network
- Assign static IP or DHCP reservation on router
- Set hostname (e.g., `dev-studio` or `mac-studio`)
- Verify LAN access from laptop: `ping 192.168.86.x`

### Remote access
- Enable SSH: System Settings > General > Sharing > Remote Login
- Set up SSH key auth from laptop: `ssh-copy-id dev-studio`
- Verify: `ssh dev-studio` connects without password

## Software requirements

### Node.js
- Node.js 20+ via nvm or Homebrew
- Verify: `node --version`

### Claude Code CLI
- Install: `npm install -g @anthropic-ai/claude-code`
- Authenticate: Run `claude` interactively once, complete OAuth with Max plan
- Verify: `claude -p "What is 2+2?" --output-format json` returns valid JSON
- Note: `claude -p` uses the Max plan subscription — no API key needed

### Git
- Configure with same GitHub account as laptop
- Set up SSH key for GitHub: `ssh-keygen -t ed25519` + add to GitHub
- Verify: `ssh -T git@github.com`

### Project repos
- Clone all project repos to a consistent directory (e.g., `~/Projects/`)
- Each project on its `dev` branch
- Verify: all repos clean, correct branches checked out

## Network topology

```
Laptop (192.168.86.x)
    │
    ├── SSH → Mac Studio (192.168.86.x)
    │              │
    │              ├── LAN → NAS PostgreSQL (192.168.86.18:32775)
    │              ├── LAN → NAS n8n (192.168.86.18:32777)
    │              ├── LAN → NAS ToDo (192.168.86.18:port TBD)
    │              │
    │              └── localhost:3400 → Dev Server dashboard
    │
    └── Browser → http://192.168.86.x:3400 (Dev Server dashboard)
```

No Cloudflare tunnel needed for Mac Studio to NAS communication. Tunnel is optional for external access to the dashboard from outside the home network.

## Verification checklist

- [ ] macOS energy settings configured (no auto-sleep)
- [ ] Static IP or DHCP reservation set
- [ ] SSH enabled and key auth working from laptop
- [ ] Node.js 20+ installed
- [ ] Claude Code CLI installed and authenticated
- [ ] `claude -p` returns valid JSON
- [ ] `claude -p` with `--tools` restriction works correctly
- [ ] Git configured with GitHub SSH access
- [ ] All project repos cloned and on correct branches
- [ ] Can reach NAS PostgreSQL from Mac Studio
- [ ] Can reach NAS n8n from Mac Studio

## Claude Code rate limits

The Max plan is shared between the laptop and the Mac Studio. Both devices use the same OAuth session. Rate limits apply across both.

**Implication:** If Simon is actively working in Claude Code on the laptop while the Dev Server is running workers on the Mac Studio, both contribute to the same rate limit pool. The Dev Server should respect this — do not run many parallel workers while Simon is also using Claude Code interactively.
