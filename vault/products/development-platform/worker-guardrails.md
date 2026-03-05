---
title: Worker Types and Guardrails
status: draft
author: both
created: 2026-03-05
updated: 2026-03-05
parent: overview
---

# Worker Types and Guardrails

Workers are `claude -p` child processes spawned by the Dev Server with specific tool restrictions, budget caps, and turn limits. Each worker type has a preset that defines exactly what it can and cannot do.

## Four worker types

| Worker | Purpose | Simon's role |
|---|---|---|
| **Researcher** | Read-only analysis — "What is the state of X?" | Reviews the report |
| **Designer** | Creates design artifacts — problem statements, PRDs, user flows, architecture docs, prototypes | Reviews and approves design before build proceeds |
| **Builder** | Implements code changes on isolated branches | Reviews diffs and merges or discards |
| **Reviewer** | Runs tests and reviews code quality | Reads the pass/fail report |

Simon spends his time on **design review** (where his product thinking adds the most value) and **build review** (verifying the output).

## Preset definitions

### Researcher

Can only look. Zero write access. Used for: "What endpoints exist?", "What is the test coverage?", "What are the dependencies?"

- **Tools:** Read, Glob, Grep, WebSearch, WebFetch
- **Permission mode:** plan (read-only)
- **Model:** Haiku
- **Max turns:** 15
- **Budget:** $1.00

### Designer

Can write documents and prototypes. Cannot touch application code. Used for: "Write the problem statement", "Create user flows", "Draft the architecture doc", "Build a clickable prototype."

- **Allowed tools:** Read, Glob, Grep, WebSearch, WebFetch, Write, Edit
- **Disallowed tools:** Bash(npm *), Bash(node *), Bash(git push *), Bash(git merge *), Bash(rm -rf *), Bash(rm -r *), Bash(ssh *), Bash(docker *)
- **Permission mode:** acceptEdits
- **Model:** Sonnet
- **Max turns:** 25
- **Budget:** $5.00
- **Path restriction:** Only writes to docs/, prototypes/, and *.md files. System prompt instructs: do NOT modify application source code.

### Builder

Can edit application code and test. Cannot push, delete, or access network.

- **Allowed tools:** Read, Glob, Grep, Edit, Write, Bash(npm test *), Bash(npm run *), Bash(git add *), Bash(git commit *), Bash(git status), Bash(git diff *)
- **Disallowed tools:** Bash(git push *), Bash(git merge *), Bash(rm -rf *), Bash(rm -r *), Bash(ssh *), Bash(curl *), Bash(wget *), Bash(docker *), Bash(npm publish *)
- **Permission mode:** acceptEdits
- **Model:** Sonnet
- **Max turns:** 30
- **Budget:** $10.00

### Reviewer

Can read and run tests. Cannot edit files.

- **Tools:** Read, Glob, Grep, Bash
- **Allowed tools:** Bash(npm test *), Bash(npm run lint *)
- **Disallowed tools:** Edit, Write, Bash(rm *), Bash(git push *), Bash(git merge *), Bash(ssh *), Bash(docker *)
- **Model:** Sonnet
- **Max turns:** 20
- **Budget:** $5.00

## Isolation layers

| Layer | What it prevents | How |
|---|---|---|
| **Tool restrictions** | Worker using tools outside its role | `--tools` and `--disallowedTools` — hard block at CLI level |
| **Budget cap** | Runaway API spend | `--max-budget-usd` — process exits when reached |
| **Turn limit** | Infinite loops | `--max-turns` — process exits when reached |
| **Git branch** | Changes to main codebase | Worker operates on `worker/{task-id}` branch |
| **Permission mode** | Unintended writes | `--permission-mode plan` for researchers |
| **Working directory** | Cross-project contamination | `cwd` set to the specific project repo |

## What workers CANNOT do (enforced, not advisory)

- Push to any remote
- Merge branches
- Delete files recursively
- SSH to the NAS or any other machine
- Make HTTP requests via curl/wget from Bash
- Run Docker commands
- Access other project directories
- Install or publish npm packages
- Exceed their budget or turn limit

## Protected paths

Workers must never modify Simon's operational infrastructure. Three enforcement layers:

### Layer 1: System prompt instruction

Every worker brief includes explicit protected paths:
- `~/.claude/` (skills, CLAUDE.md, plans, memory, config)
- `~/.claude.json` (MCP config)
- Any project CLAUDE.md file
- Any directory outside the assigned project

### Layer 2: Post-execution diff validation

After every worker completes, the result collector:
1. Runs `git diff --name-only` on the worker branch
2. Checks every modified file path against a protected paths allowlist
3. If any file outside the project directory was modified → task marked FAILED
4. If any CLAUDE.md, `.claude/`, or config file was modified → task marked FAILED
5. Validation results are shown in the dashboard

### Layer 3: Structured escalation output

Workers produce structured JSON output with an `escalations` field. Any cross-project issue goes there instead of being acted on.

## Escalation protocol

| Situation | Worker action |
|---|---|
| Bug found in another project | Escalation: type `cross-project` |
| Skill file needs updating | Escalation: type `skill-update` |
| CLAUDE.md needs a new rule | Escalation: type `config-change` |
| Shared dependency needs upgrading | Escalation: type `dependency` |
| Test in another project breaks | Escalation: type `bug` |
| Infrastructure change needed | Escalation: type `dependency` |

**The principle:** Workers execute within their boundary. Everything outside the boundary becomes a ToDo item, not an action. Simon decides what to act on and when.

This mirrors the existing Cross-Project Modification Boundary rule in the global CLAUDE.md, but enforced at the system level.
