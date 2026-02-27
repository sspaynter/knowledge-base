# Knowledge Platform — Problem Statement

**Date:** 2026-02-27
**Status:** Confirmed
**Author:** Simon Paynter + Claude

---

## Who this is for

**Anyone who produces knowledge and wants one place for all of it.**

Notes, how-tos, ideas, research, decisions, project documentation, business information, personal reference, drawings, voice captures, blog drafts — everything. Not organised by tool or by where it happened to land. Organised by how you think.

For people who also operate complex technology environments — AI systems, infrastructure, integrations — it goes further: it stores the actual artifacts, maps how everything connects, and gives AI direct access to that context.

The base product is a universal knowledge library. The technical mapping capability is what makes it distinctive.

---

## The problems

### 1. Fragmentation — "where did I write that?"
Knowledge is scattered across multiple tools — OneNote, Notion, Confluence, Miro, GitHub, and more. There is no single place to search across all of it. You know something exists. You cannot find it.

### 2. No tool gets it right

Every existing option forces a compromise:

| Tool | What works | What breaks |
|---|---|---|
| Confluence | Hierarchical structure, page organisation | Costs money, locked in, not yours |
| OneNote | Free, iPad-native, quick capture | Drawings not searchable, not web-first |
| Notion | App experience, flexible | Tries to do too much, hits walls |
| Miro | Visual thinking | Disconnected from everything else |

Nobody delivers: **Confluence structure + app experience + ownership + zero ongoing cost.**

### 3. Search and discoverability
Captured knowledge is effectively lost if it cannot be found. Everything — text, images, imported voice notes, drawings, configs, artifacts — needs to be findable. Metadata on all content types is essential. Without powerful search, capture is pointless.

### 4. AI rebuilds context every session
Documentation already exists somewhere. AI cannot access it. Every session starts from scratch — re-explaining your stack, your decisions, how things are configured. You want to write once, for yourself as a human reader, and have that knowledge persist as permanent AI-accessible memory across all sessions.

### 5. AI is moving too fast to track
AI systems are not static. Skills change, agents evolve, configurations shift, new tools appear. There is no living record of how your AI environment is currently configured, what depends on what, and why decisions were made. You cannot track a moving target with scattered notes.

### 6. Session knowledge evaporates
Valuable decisions and discoveries from AI sessions disappear into chat history. They are ephemeral. Nothing formally captures what was decided, what was built, and what changed in a session — at the moment it happens. The knowledge exists briefly, then is effectively lost unless someone manually writes it down.

### 7. No record of how things evolved
Things change — configs, skills, decisions, how systems are set up. But the previous state and the reasoning disappear. There is no history of what something was before, when it changed, or why. Without that, you cannot understand the current state or trace how you got there.

### 8. No visibility of how your technology ecosystem connects
Your environment is complex — Apple, Google, NAS, SaaS tools, custom apps, AI integrations. These are not independent. They connect, depend on each other, and interact. That map lives only in your head. As it grows, that breaks down. There is no visual, queryable picture of how everything fits together.

### 9. Artifacts are disconnected from documentation
The actual underlying artifacts — configs, scripts, skill files, API definitions, diagrams — live separately from the documentation that describes them. When one changes, the other does not. There is no single place where the artifact and its context live together.

### 10. Your tools do not share data
Lifeboard tracks projects. The knowledge platform holds documentation. GitHub tracks code and issues. Mobile tools capture on the go. None of them talk to each other. Logs, decisions, and project context get duplicated or dropped. There is no hub.

### 11. Knowledge cannot be shared in a controlled way
There is no way to give others structured, controlled access to your knowledge — by workspace, by role, or by context. Sharing means giving access to everything or nothing. As this platform becomes the hub for projects and client work, that is not sustainable.

### 12. The data lock-in problem
Every tool bundles two things that should be separate: **the data store and the presentation layer.** Your knowledge lives inside another tool's format. The interface and the data are inseparable. This means:

- You cannot add a mapping view to Confluence — it is not built for that
- You cannot search across OneNote and Notion together — they are separate stores
- You cannot change how your knowledge is presented without migrating everything
- Your second brain is owned and shaped by someone else's product decisions

---

## In one sentence

**There is no single knowledge store that you own — where you can write and organise directly, everything is searchable, AI can query it directly, tools can inject content into it automatically, and you can present and explore that knowledge in multiple ways without being locked into someone else's product.**

---

## What this is and is not

**What this is:**
A knowledge store the user owns, with a human-first authoring interface. The user creates pages, writes notes, builds structure, and organises their knowledge directly inside the tool — just as they would in Confluence or Notion. Tools and AI can also inject content automatically. Both are first-class. Neither replaces the other.

**What this is not:**
- A task manager (that is Lifeboard)
- A code repository (that is GitHub)
- A real-time collaboration tool
- A replacement for specialised creative tools

It is the hub that everything else connects to.

---

## Scope

### Version 1 — Personal, self-hosted
Built for a single user. Fully extensible, no compromises, self-hosted on personal infrastructure. The primary second brain. All problems above are in scope. This is the reference implementation — the full product with no artificial limitations.

### Version 2 — Portable, platform-based
A cut-down version built on an existing platform — likely Notion. Designed for others to adopt easily, without needing to run their own infrastructure. Trades some capability and extensibility for portability and zero setup cost. The same problems are solved, but within the constraints of the host platform.

Version 2 is informed by Version 1. The data model and problem space are the same. The substrate is different.

---

## Related projects

| Project | Role |
|---|---|
| Lifeboard | Task and project tracking — writes project data into the knowledge platform |
| GitHub | Code and issue management — logs and decisions surface in the knowledge platform |
| Mobile capture tools | Quick input on the go — push content into the knowledge platform via API |
| Claude / AI sessions | Query the knowledge platform directly for context, write documentation back into it |
