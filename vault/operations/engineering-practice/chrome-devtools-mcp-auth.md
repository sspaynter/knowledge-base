---
author: both
order: 220
title: Chrome DevTools MCP — Authenticated Browser Access
---


# Chrome DevTools MCP — Authenticated Browser Access

How to give Claude Code browser access to apps protected by Google OAuth (or any session-based auth) using the Chrome DevTools MCP.

## The Problem

Google blocks OAuth sign-in when Chrome is controlled via Chrome DevTools Protocol (CDP). The detection is multi-layered — `navigator.webdriver`, WebSocket signatures, `Runtime.enable` patterns, and behavioural analysis. There is no reliable way to bypass this while CDP is active.

The error displayed: **"Couldn't sign you in — This browser or app may not be secure."**

## The Solution: Authenticate First, Connect CDP After

The production-proven pattern across all CDP-based automation:

1. Launch Chrome with a **persistent profile** and the debug port
2. Manually sign in to Google OAuth **before** MCP connects
3. MCP connects to the already-authenticated session
4. Session cookies persist across Chrome restarts

## Setup

### 1. Profile directory

```bash
mkdir -p ~/.chrome-mcp-profile
```

This dedicated profile stores cookies, session data, and browsing state. Do not use it as a general browser — keep it scoped to testing.

### 2. Shell alias

Add to `~/.zshrc`:

```bash
alias chrome-debug='/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.chrome-mcp-profile"'
```

### 3. Claude Code MCP config

In `~/.claude.json` (both global `mcpServers` and project-level entries):

```json
"chrome-devtools": {
  "type": "stdio",
  "command": "npx",
  "args": [
    "-y",
    "chrome-devtools-mcp@latest",
    "--browser-url=http://127.0.0.1:9222"
  ],
  "env": {}
}
```

## Usage Workflow

### First time (or when session expires)

1. Run `chrome-debug` in Terminal — Chrome opens with the MCP profile
2. Navigate to the app (e.g. `applyr-staging.ss-42.com`) and complete Google sign-in manually
3. Tell Claude you are signed in — MCP connects and takes over navigation

### Subsequent sessions

1. Run `chrome-debug` in Terminal
2. Tell Claude to connect — session cookies are already present, no sign-in needed
3. Re-authenticate only when session cookies expire

### Verifying the debug port

```bash
curl -s http://127.0.0.1:9222/json/version
```

Returns JSON with browser version if the port is active. Connection refused means Chrome is not running with debugging.

## Security Considerations

- **Port 9222 binds to localhost only** — not exposed to the network
- **No authentication on CDP** — any local process can connect and control the browser
- **Only run when needed** — close the debug Chrome when not actively using it with Claude
- **Do not sync passwords or bookmarks** — skip Chrome sync setup in the MCP profile
- **Do not use for sensitive activities** — no banking, no personal email browsing
- **Profile directory** (`~/.chrome-mcp-profile`) stores cookies on disk — same risk as a normal Chrome profile

## Alternatives Considered

| Approach | Verdict |
|---|---|
| `--disable-blink-features=AutomationControlled` | Unreliable — Google detects more than `navigator.webdriver` |
| Cookie injection via CDP | Medium reliability — Google may invalidate fingerprint-bound cookies |
| Chrome 144+ `--autoConnect` | Promising — same auth-first principle, cleaner connection. Consider when Chrome 144 reaches stable. |
| undetected-chromedriver / nodriver | Python-only, overkill for Claude Code MCP use case |
| Firefox + WebDriver BiDi | Unconfirmed whether it avoids Google detection |

## Applies To

Any SS42 app using Google OAuth via `shared_auth`:
- Applyr (`applyr-staging.ss-42.com`, `jobs.ss-42.com`)
- Knowledge Base (`kb.ss-42.com`)
- Any future app on the SSO cookie domain (`.ss-42.com`)
