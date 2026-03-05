# Product Design Skill — Design Doc

**Date:** 2026-02-28
**Status:** Approved — ready for implementation
**Author:** Simon Paynter + Claude

---

## What this is

A global Claude skill that runs a full structured product design process from raw idea to executable implementation plan. Enforces sequential gates — Claude will not proceed to the next gate until the current one is explicitly confirmed by Simon.

Reusable across all projects. Designed to be invoked at the start of any new feature or product design session.

---

## Why it needs to exist

Without a structured gate-based process:
- It is easy to jump to solutions before problems are fully understood
- Design specs get written to match a pre-existing solution in mind
- Navigation errors and missing states are discovered mid-build, not before
- Work gets done twice — design → build → discover the wrong problem → re-design

The prototype gate (Gate 3) is the key addition: it catches UI and flow problems before a line of implementation code is written.

---

## Architecture

Single file, global, rigid.

```
~/.claude/skills/product-design/
  SKILL.md
```

**Type:** Rigid — the gate structure must be followed exactly. Claude will not skip or reorder gates regardless of perceived simplicity.

**Invocation:** via the `Skill` tool — `skill: "product-design"`

**Dependencies:**
- `superpowers:brainstorming` — loaded at Gate 1
- `superpowers:writing-plans` — loaded at Gate 4

---

## Gate structure

Five gates, sequential, mandatory. Claude announces the current gate at the start of each one. Each gate requires explicit user confirmation before proceeding.

| Gate | Name | Loads | Output |
|---|---|---|---|
| 0 | Framing | — | One-sentence product frame |
| 1 | Problem space | `superpowers:brainstorming` | `docs/plans/[date]-problem-statement.md` |
| 2 | Design | — | `docs/plans/[date]-[name]-design.md` |
| 3 | Prototype + review | — | Annotated HTML prototype; feedback incorporated into design spec |
| 4 | Implementation plan | `superpowers:writing-plans` | `docs/plans/impl-*.md` + merged plan |

---

## Gate 0 — Framing

**Purpose:** Establish shared scope before any work begins.

Steps:
1. Simon states the initial idea or problem area
2. Claude confirms scope: "Is this about X?" — get agreement on what domain we are in
3. Clarify: who is the primary user, what project does this belong to

**Gate passes when:** Simon confirms the one-sentence product frame.

**Output:** One-sentence product frame (recorded at the top of the problem statement doc)

---

## Gate 1 — Problem space

**Purpose:** Fully understand the problem before any solution thinking.

Steps:
1. Load `superpowers:brainstorming`
2. Run structured discovery — question categories:
   - Who has this problem?
   - What breaks without a solution?
   - What already exists and what are the gaps?
   - How often does this occur and how severe is it?
   - What workarounds are people using?
3. Push past first-pass descriptions — ask for concrete examples and specifics
4. Write the problem statement document when all problems are surfaced

**Gate passes when:** Simon confirms: "Yes, that is the problem."

**Output:** `docs/plans/[date]-problem-statement.md`

---

## Gate 2 — Design

**Purpose:** Translate confirmed problems into a complete product definition.

Sections to cover:
- What it is and what it is not
- Information architecture
- Data model
- API design
- UI design (screens, flows, states)
- Visual design
- Write paths (how data is created/edited/deleted)
- Roles and permissions (if applicable)
- Tech stack
- Out of scope

If an existing design spec exists: check it against the problem statement and fix any gaps before proceeding.

Present design in sections. Ask for confirmation after each section.

**Gate passes when:** Simon confirms: "Yes, that is the design."

**Output:** `docs/plans/[date]-[name]-design.md`

---

## Gate 3 — Prototype + review

**Purpose:** Validate the design spec visually before writing any implementation code.

Steps:
1. Take the confirmed design spec from Gate 2 as input
2. Generate `prototype-[feature-name].html` — a single self-contained file:
   - Multi-screen navigation matching the spec
   - All user flows clickable end-to-end
   - Modals, dropdowns, empty states, and error states present
   - Click-to-annotate layer on every element
   - Numbered notes panel (collapsible side panel)
   - Copy-feedback button (exports all annotations as structured plain text)
3. Run `open prototype-[feature-name].html` automatically
4. Wait for Simon to review, annotate, and paste back the copied feedback
5. Update the design spec if changes are needed, or confirm it holds

**Prototype constraints:**
- Single HTML file — inline all CSS and JS, no external dependencies
- No server required — opens directly from the filesystem
- No persistence required — notes do not survive a page reload
- Dark theme
- DM Sans (Google Fonts CDN)
- Lucide icons (CDN UMD)

**Copy feedback output format:**
```
Screen: [Screen name]
[1] [Element description] — "[Note text]"
[2] [Element description] — "[Note text]"

Screen: [Screen name]
[3] [Element description] — "[Note text]"
```

**Gate passes when:** Simon confirms: "Flows look right, ready to plan."

**Output:** Feedback incorporated into design spec. Prototype file saved as `prototype-[feature].html` in the project root if useful to keep.

---

## Gate 4 — Implementation plan

**Purpose:** Write a detailed, phased, executable implementation plan from the validated design.

Steps:
1. Load `superpowers:writing-plans`
2. Explore the existing codebase — understand what already exists before planning
3. Write plan in phases, each as a separate file (avoids token limits):
   - Default phase boundaries: Database → Backend → Frontend foundation → Frontend components → Deployment
   - Adjust phase boundaries to fit the project
4. Each task follows TDD pattern — test written before implementation
5. Security: all DOM content uses `textContent` or sanitised DOM building — no direct string-to-DOM assignment
6. Merge phases at the end: `cat impl-*.md > full-plan.md`

**Gate passes when:** All phase files are written and merged.

**Output:** `docs/plans/impl-01-*.md` through `impl-0N-*.md` + merged `[date]-[product-name]-implementation-plan.md`

---

## Enforcement rules

- Claude announces the current gate at the start of each one: "**Gate 1 — Problem space.** We are here until..."
- Claude will not proceed to the next gate without explicit user confirmation
- If Simon tries to jump ahead, Claude redirects: "We are still at Gate [N]. Let us finish [what remains] before moving on."
- Gates cannot be skipped, even for apparently simple features

---

## Testing plan

Once the skill file is built:

1. Invoke the skill in a new session in `knowledge-base/`
2. Skip to Gate 3 — the design spec already exists (`docs/plans/2026-02-27-knowledge-base-redesign.md`)
3. Generate the annotated prototype from that spec
4. Confirm the prototype opens, annotation layer works, and copy-feedback produces clean output
5. If all passes: skill is ready for use on the next project

---

## Related files

| File | Role |
|---|---|
| `docs/knowledge-base/product-design-skill-spec.md` | Original skill spec — superseded by this design doc |
| `docs/plans/2026-02-28-annotated-prototype-tool.md` | Prototype tool build spec — incorporated into Gate 3 |
| `docs/knowledge-base/product-design-prototype-flow.md` | Research and rationale for the prototype gate |
| `docs/plans/2026-02-27-knowledge-base-redesign.md` | Test input for Gate 3 validation |
