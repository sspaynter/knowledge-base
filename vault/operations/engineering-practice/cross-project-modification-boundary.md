---
title: Cross-Project Modification Boundary
parent: engineering-practice
order: 30
status: published
author: claude
created: 2026-03-04
updated: 2026-03-04
---

A rule governing which projects a Claude session is permitted to modify, and how issues found in other projects must be handled.

## The rule

Every session has a declared active project. A session must not modify application code, push git commits, restart containers, or change databases in any project other than its active project — regardless of what is discovered during the session.

If a bug or issue is found in a different project:

1. Add it to MASTER-TODO.md (or the ToDo app once live) with the project, file, and a clear description
2. Do not fix it in the current session
3. The correct session — the one managing that project — handles it through the development pipeline

This applies to: source file edits, git commits, `docker cp`, container restarts, DB schema changes, and any modification to a running system.

Sessions started from `~/Documents/Claude/` (root directory) must confirm their active project with the user before touching any project code.

---

## Why this rule exists

On 2026-03-04, a session managing the ToDo Gate 4 pre-work discovered a bug in the Knowledge Base application (`services/pages.js` — `getPageTree` returning a nested structure the client could not render). The session:

1. Edited the source file directly
2. Hot-patched the staging container via `docker cp`
3. Committed the fix and pushed to the `dev` branch
4. All without going through the development pipeline

The fix was correct, but the process was wrong. The commit had to be reverted immediately because the Knowledge Base had an active session doing concurrent work on the same branch.

The core problem: a session managing one project used its access to fix something in a different project, bypassing the pipeline, creating a risk of conflict with active concurrent work, and establishing a pattern that would eventually cause data loss or a broken deployment.

---

## The correct behaviour

The session should have:

1. Identified the bug in `services/pages.js`
2. Documented it in MASTER-TODO.md with the file, the issue, and enough detail for the KB session to pick it up
3. Continued with its own active project work
4. Left the Knowledge Base session to handle the fix through the proper process

The bug was subsequently added as task #46 in MASTER-TODO.md with a full implementation plan at `knowledge-base/docs/plans/2026-03-04-getpagetree-hierarchy-fix.md`.

---

## Window management

Claude Code (anti-gravity) opens to a folder and loads the CLAUDE.md from that directory. One window per project is the intended model:

| Window | Opens to | Active project |
|---|---|---|
| Knowledge Base | `~/Documents/Claude/knowledge-base/` | Knowledge Base only |
| ToDo | `~/Documents/Claude/todo/` | ToDo only |
| Applyr | `~/Documents/Claude/job-app/` | Applyr only |
| Root | `~/Documents/Claude/` | Cross-project tasks only — no application code changes |

Multiple sessions inside one project window are all scoped to that project automatically.

The root window is for: master todo maintenance, session logging, vault maintenance, and cross-project planning. It must not make application code changes in any project.

---

## Where the rule lives

The rule is encoded in `~/.claude/CLAUDE.md` under the **Cross-Project Modification Boundary** section. It applies globally to every session.
