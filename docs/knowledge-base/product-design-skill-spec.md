# Skill Spec: `product-design`

> **Status (2026-02-28):** Built and validated. Skill file is at `~/.claude/skills/product-design/SKILL.md`. Gate numbering updated: prototype review is Gate 3, implementation plan is Gate 4. This document is retained as reference only.

**Type:** Reference / Skill specification
**Workspace:** IT & Projects
**Section:** Claude
**Template:** skill-page
**Status:** Draft — awaiting build
**Created:** 2026-02-27
**Author:** Simon Paynter + Claude

---

## What this skill does

Runs a full structured product design process from raw idea to executable implementation plan. Enforces sequential gates — does not allow solution thinking until the problem space is fully explored.

Based directly on the process used to design the Knowledge Platform in February 2026. That session is the reference implementation.

## Why this skill needs to exist

Without a structured gate-based process:
- It is easy to jump to solutions before problems are fully understood
- Design specs get written to match a pre-existing solution in mind
- The implementation plan does not account for problems that were never surfaced
- Work gets done twice — design → build → discover the wrong problem → re-design

The Knowledge Platform session showed what the right process looks like when it is followed. This skill encodes that process so it can be repeated reliably.

## The process (four gates)

### Gate 0 — Framing
Before anything: what are we designing and for whom?
- Simon states the initial idea or problem area
- Claude confirms scope: "Is this about X?" — get agreement on what domain we are in
- Output: one-sentence product frame

### Gate 1 — Problem space (enforced)
Do not leave this gate until the problem statement is confirmed.

- Load `superpowers:brainstorming` skill
- Run structured discovery: who has this problem, what breaks without a solution, what exists, what are the gaps
- Question categories: users, context, pain points, existing tools, what works/fails, frequency, severity, workarounds
- Do not accept first-pass problem descriptions — push for concrete examples and specifics
- When all problems surfaced: write the problem statement document
- Gate passes when Simon confirms: "Yes, that is the problem"
- Output: `docs/plans/[date]-problem-statement.md`

### Gate 2 — Design
Do not write an implementation plan until the design is confirmed.

- Translate confirmed problems into product definition
- Cover: what it is, what it is not, information architecture, data model, API design, UI design, visual design, write paths, settings/roles, tech stack, out of scope
- If an existing design spec exists: check it against the problem statement — fix gaps
- When design is complete: review with Simon
- Gate passes when Simon confirms: "Yes, that is the design"
- Output: `docs/plans/[date]-[product-name]-design.md`

### Gate 2.5 — Prototype + review (optional but recommended)
Do not skip this gate for any feature with non-trivial navigation or multi-screen flows.

- Generate a single-file annotated HTML prototype from the confirmed design spec
- Open in browser automatically
- Simon clicks through all user flows, adds sticky-note annotations on any element
- Copies structured feedback from the "Copy feedback" button
- Paste feedback into Claude
- Claude updates the design spec if changes are needed, or proceeds to Gate 3 if the design holds
- Gate passes when Simon confirms: "Flows look right, ready to plan"
- Output: feedback incorporated into design spec; prototype file saved as `preview-[feature].html` if useful to keep

**Why this gate exists:**
Building from a text description of UI means problems are discovered mid-build. A 20-minute prototype review catches navigation errors, missing states, and layout problems before any implementation code is written.

**Minimum viable prototype includes:**
- Multi-screen navigation matching the spec
- Click-to-annotate on any element
- Notes panel with numbered entries
- Copy feedback button (structured text output)

**Reference:** `docs/knowledge-base/product-design-prototype-flow.md`

### Gate 3 — Implementation plan
Load `superpowers:writing-plans` skill.

- Explore existing codebase to understand what already exists
- Write plan in phases — each phase is a separate file to avoid token limits
- Phase boundaries: Database → Backend → Frontend foundation → Frontend components → Deployment
- Each task follows TDD pattern (test first, then implementation)
- Security: all DOM content uses textContent or sanitized DOM building — no direct string-to-DOM assignment
- Merge phases at the end: `cat impl-*.md > full-plan.md`
- Gate passes when all phase files are written and merged
- Output: `docs/plans/impl-01-*.md` through `impl-0N-*.md` + merged `[date]-[product-name]-implementation-plan.md`

## What makes this different from just using brainstorming + writing-plans

- The gate structure is **enforced** — Claude will not proceed to Gate 2 until Gate 1 is confirmed by Simon
- The skill knows the **specific question categories** for problem discovery (not generic brainstorm prompts)
- The phased plan approach is **built in** — no mid-session decision about how to handle token limits
- The security patterns are **built in** — textContent / DOMParser / DOMPurify is the default, not a workaround

## What this skill is not

- Not a replacement for `superpowers:brainstorming` or `superpowers:writing-plans` — it calls both
- Not for building things — it produces documents (problem statement, design spec, implementation plan)
- Not for refining an existing design — it starts from a raw idea

## Reference implementation

Knowledge Platform — February 2026:
- Problem statement: `knowledge-base/docs/plans/2026-02-27-problem-statement.md`
- Design spec: `knowledge-base/docs/plans/2026-02-27-knowledge-base-redesign.md`
- Implementation plan: `knowledge-base/docs/plans/2026-02-27-knowledge-platform-implementation-plan.md`

## Build notes (for when this skill is built)

- File: `~/.claude/skills/product-design/SKILL.md`
- Type: rigid (not flexible — the gate structure must be followed exactly)
- Invocation: `superpowers:product-design` or standalone
- The skill should explicitly state at the start of each gate what the current gate is and what must happen before proceeding
- If Simon tries to jump to a later gate, the skill should redirect: "We are still at Gate 1. Let us finish exploring the problem before moving to design."
