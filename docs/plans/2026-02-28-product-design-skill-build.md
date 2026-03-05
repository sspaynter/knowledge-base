# Product Design Skill — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build and validate a global `product-design` Claude skill that enforces a five-gate product design process, including a mandatory prototype review gate.

**Architecture:** Single `SKILL.md` file at `~/.claude/skills/product-design/SKILL.md`. Rigid type — gates must be followed in order. Gate 3 embeds the annotated HTML prototype prompt pattern. Gates 1 and 4 load external sub-skills (`superpowers:brainstorming`, `superpowers:writing-plans`).

**Tech Stack:** Markdown (skill file). HTML/CSS/JS inline (prototype output). DM Sans (Google Fonts CDN), Lucide icons (CDN UMD). No build tooling, no server, no database.

**Design doc:** `docs/plans/2026-02-28-product-design-skill-design.md`

**Key facts:**
- Skill file location: `~/.claude/skills/product-design/SKILL.md`
- Test input: `docs/plans/2026-02-27-knowledge-base-redesign.md`
- Related skill spec (superseded): `docs/knowledge-base/product-design-skill-spec.md`
- No automated tests — validation is manual review + prototype generation check

---

## Task 1: Create the skill directory and write SKILL.md

**Files:**
- Create: `~/.claude/skills/product-design/SKILL.md`

**Step 1: Create the directory**

```bash
mkdir -p ~/.claude/skills/product-design
```

Expected: directory created, no output.

**Step 2: Write the skill file**

Create `~/.claude/skills/product-design/SKILL.md` with the following content exactly:

````markdown
# Skill: product-design

**Type:** Rigid — follow exactly. Do not adapt away from the gate structure. Do not skip gates for simple features.

**Use this skill when:** Simon wants to design a new product, feature, or workflow from scratch, or when no design doc exists yet.

---

## Hard rule: gate enforcement

At the start of each gate, announce exactly:

> **Gate [N] — [Name].** [One sentence: what must happen before this gate passes.]

Do NOT proceed to the next gate without Simon's explicit confirmation. If Simon tries to skip ahead, redirect:

> "We are still at Gate [N]. Let us finish [what remains] before moving on."

Do NOT skip any gate, even if the feature seems simple.

---

## Gate 0 — Framing

**Announce:** "Gate 0 — Framing. Before we begin: what are we designing and for whom?"

1. Simon states the initial idea or problem area
2. Restate it back: "So this is about [X] — is that right?" — get explicit agreement
3. Ask: "Who is the primary user?" if not clear from context
4. Write a one-sentence product frame: "[Product] helps [user] [do something] by [mechanism]"

**Gate passes when:** Simon confirms the product frame.

---

## Gate 1 — Problem space

**Announce:** "Gate 1 — Problem space. We stay here until the problem is fully understood — no solution thinking yet."

Load `superpowers:brainstorming`.

Run structured discovery. Ask one question at a time. Use these categories in order:

- **Users:** Who specifically has this problem? What are they doing when they hit it?
- **Pain:** What breaks or fails without a solution? What does that cost them?
- **Existing tools:** What do they use today? What works, what does not?
- **Frequency / severity:** How often does this happen? How bad is it when it does?
- **Workarounds:** What do they do instead? Why is that not good enough?

Push past first-pass descriptions. If Simon says "it's frustrating", ask: "Can you give me a concrete example of when this happened?"

When all problems are surfaced, write the problem statement document before moving on.

**Gate passes when:** Simon confirms: "Yes, that is the problem."

**Output:** `docs/plans/[date]-problem-statement.md`

---

## Gate 2 — Design

**Announce:** "Gate 2 — Design. We define the full solution before writing an implementation plan or prototype."

Cover each section below. Present one at a time. Ask for confirmation as you go. Do not move to the next section until Simon agrees.

1. **What it is** — one paragraph describing the product or feature
2. **What it is not** — explicit out-of-scope items
3. **Information architecture** — screens, sections, navigation structure
4. **Data model** — entities, fields, relationships
5. **API design** — endpoints, inputs, outputs
6. **UI design** — screen layouts, key components, all states (empty, loading, error, success)
7. **Visual design** — colour, typography, spacing, icons
8. **Write paths** — how data is created, edited, deleted
9. **Roles and permissions** — who can do what (skip if single-user)
10. **Tech stack** — languages, frameworks, libraries, infrastructure
11. **Out of scope** — explicit list of what is not being built

If an existing design spec exists: check it against the problem statement. Fix gaps. Do not assume it is complete or correct.

**Gate passes when:** Simon confirms: "Yes, that is the design."

**Output:** `docs/plans/[date]-[name]-design.md`

---

## Gate 3 — Prototype + review

**Announce:** "Gate 3 — Prototype + review. Generating a clickable annotated prototype from the design spec before we plan implementation."

### Step 1 — Generate the prototype

Using the confirmed design spec from Gate 2 as input, generate a single file named `prototype-[feature-name].html`.

The file must be entirely self-contained — inline all CSS and JavaScript. No server required. Must open directly from the filesystem (`file://`).

**Required elements:**

**Multi-screen navigation**
- Every screen defined in the spec is present
- Navigation between screens works without page reloads
- A screen switcher (top bar or sidebar) lists all screens and allows direct jumping

**Complete user flows**
- Every button, link, modal, dropdown, and transition in the spec is clickable
- All states are present: empty state, loading state, error state, success state
- Forms are interactive — inputs accept text, selects work, buttons respond

**Click-to-annotate layer**
- Clicking any element on any screen opens a text input anchored near that element
- Typing a note and pressing Enter or clicking Save pins a numbered badge to that element
- Clicking the badge again shows or hides the note text
- Clicking elsewhere without saving dismisses the input without creating a note
- Each screen's annotations are stored independently

**Notes panel**
- Collapsible side panel
- Lists all annotations with: annotation number, screen name, element description (auto-captured from tag, label, or aria attribute), note text
- Clicking an annotation item navigates to that screen and highlights the annotated element
- Empty state: "No notes yet — click any element to annotate"

**Copy feedback button**
- Exports all annotations as structured plain text, copied to clipboard
- Output format:
  ```
  Screen: [Screen name]
  [1] [Element description] — "[Note text]"
  [2] [Element description] — "[Note text]"

  Screen: [Screen name]
  [3] [Element description] — "[Note text]"
  ```
- Brief confirmation feedback on click ("Copied!") before reverting
- Disabled or shows empty-state message if no annotations exist

**Visual constraints:**
- Dark theme throughout
- Font: DM Sans — load via Google Fonts: `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap`
- Icons: Lucide — load via CDN UMD: `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`
- Annotation badges: small numbered circles, high-contrast colour (amber or orange), positioned top-right of the annotated element
- Notes panel: fixed right side, ~300px wide, scrollable

### Step 2 — Open in browser

```bash
open prototype-[feature-name].html
```

### Step 3 — Wait for feedback

Tell Simon:

> "The prototype is open. Click through all the flows, add annotations on any element that needs attention, then click 'Copy feedback' and paste it here."

Do not proceed until Simon pastes the feedback.

### Step 4 — Process feedback

Read the pasted annotations. For each annotation:

- Missing screen or state → add it to the design spec
- Labelling or copy issue → update the design spec
- Flow problem → fix the flow in the design spec
- Cosmetic preference → note it but do not change the spec unless Simon explicitly confirms it matters

After processing, summarise: "Updated: [list of changes]. No change needed: [list of dismissed items]."

**Gate passes when:** Simon confirms: "Flows look right, ready to plan."

**Output:** Updated design spec. Prototype saved as `prototype-[feature-name].html` in the project root if Simon wants to keep it.

---

## Gate 4 — Implementation plan

**Announce:** "Gate 4 — Implementation plan. Loading writing-plans skill."

Load `superpowers:writing-plans`. Follow that skill exactly.

**Gate passes when:** All phase files are written and merged.

**Output:** `docs/plans/impl-01-*.md` through `impl-0N-*.md` + merged `[date]-[product-name]-implementation-plan.md`
````

**Step 3: Verify the file was created**

```bash
cat ~/.claude/skills/product-design/SKILL.md | head -5
```

Expected: first five lines of the file, starting with `# Skill: product-design`.

---

## Task 2: Validate the skill file against the design doc

**Files:**
- Read: `~/.claude/skills/product-design/SKILL.md`
- Read: `docs/plans/2026-02-28-product-design-skill-design.md`

**Step 1: Cross-check gates**

Read both files and verify:

| Check | Expected |
|---|---|
| Gate 0 present | Framing — one-sentence product frame |
| Gate 1 present | Problem space — loads brainstorming, five question categories |
| Gate 2 present | Design — eleven sections, one at a time |
| Gate 3 present | Prototype — annotated HTML, opens in browser, waits for feedback |
| Gate 4 present | Implementation plan — loads writing-plans |
| Enforcement rule present | Gate announcement format, redirect wording |

**Step 2: Check prototype constraints**

Verify Gate 3 in the skill file specifies:
- [ ] Single HTML file, inline CSS and JS
- [ ] No server required, opens from filesystem
- [ ] Dark theme
- [ ] DM Sans font via Google Fonts CDN
- [ ] Lucide icons via CDN UMD
- [ ] Copy feedback output format matches design doc

**Step 3: Fix any gaps**

If any check fails, edit `~/.claude/skills/product-design/SKILL.md` to fix it before proceeding.

---

## Task 3: Test Gate 3 — prototype generation

**This task is run in a new Claude session in `knowledge-base/`.**

**Files:**
- Read: `docs/plans/2026-02-27-knowledge-base-redesign.md` (test input)
- Create: `prototype-knowledge-base.html` (output)

**Step 1: Open a new session**

Open a new Claude Code session in `/Users/simonpaynter/Documents/Claude/knowledge-base/`.

**Step 2: Invoke the skill at Gate 3**

Tell Claude:

> "Load the product-design skill. The design spec for the knowledge base is at `docs/plans/2026-02-27-knowledge-base-redesign.md`. Run Gate 3 — generate the annotated prototype from that spec."

**Step 3: Verify prototype generation**

Claude should:
1. Confirm it is at Gate 3
2. Generate `prototype-knowledge-base.html`
3. Run `open prototype-knowledge-base.html`

**Step 4: Review the prototype**

Check the prototype manually against this acceptance list:

- [ ] File opens from filesystem without errors
- [ ] At least the following screens are present based on the redesign spec:
  - Dashboard / home view
  - Workspace navigation
  - Section browser
  - Page view / editor
  - Search
- [ ] Clicking between screens works without page reload
- [ ] Clicking any element opens an annotation input
- [ ] Typing a note and pressing Enter pins a numbered badge
- [ ] Notes panel opens and lists all annotations
- [ ] Copy feedback button produces structured text in the expected format
- [ ] Dark theme, DM Sans font, Lucide icons visible

**Step 5: Add test annotations**

Add at least three annotations across two different screens. Copy the feedback and paste it back into Claude.

**Step 6: Verify feedback processing**

Claude should read the annotations and either update the design spec or confirm no changes are needed. Summarise what changed.

**Step 7: Confirm gate passes**

Confirm: "Flows look right, ready to plan." — gate should be acknowledged as passed.

---

## Task 4: Update related documentation

**Files:**
- Edit: `docs/knowledge-base/product-design-skill-spec.md`
- Edit: `docs/plans/2026-02-28-annotated-prototype-tool.md`
- Edit: `docs/knowledge-base/product-design-prototype-flow.md`

**Step 1: Update the skill spec**

Add a note at the top of `docs/knowledge-base/product-design-skill-spec.md`:

```markdown
> **Status update:** This spec has been implemented. The built skill is at `~/.claude/skills/product-design/SKILL.md`. Gate numbering updated: prototype review is now Gate 3, implementation plan is Gate 4. This document is retained as reference only.
```

**Step 2: Update the annotated prototype tool plan**

Add a note at the top of `docs/plans/2026-02-28-annotated-prototype-tool.md`:

```markdown
> **Status update:** The annotated prototype tool has been implemented as Gate 3 of the `product-design` skill at `~/.claude/skills/product-design/SKILL.md`. Option 1 (prompt pattern embedded in skill) was used. This document is retained as reference only.
```

**Step 3: Update the prototype flow doc**

Add a note at the top of `docs/knowledge-base/product-design-prototype-flow.md`:

```markdown
> **Status update (2026-02-28):** Decision implemented. Annotated HTML prototype is now Gate 3 of the `product-design` skill. See `~/.claude/skills/product-design/SKILL.md`.
```

---

## Execution order

1. Task 1 — write the skill file (this session or subagent)
2. Task 2 — validate (immediately after Task 1)
3. Task 3 — test Gate 3 (new session in knowledge-base/)
4. Task 4 — update docs (after Task 3 passes)

Tasks 1 and 2 must run sequentially. Task 3 must follow Task 2. Task 4 can run in parallel with or after Task 3.

---

## Definition of done

- [ ] `~/.claude/skills/product-design/SKILL.md` exists and passes Task 2 checklist
- [ ] Prototype generates from knowledge-base redesign spec and opens in browser
- [ ] Annotation layer works across multiple screens
- [ ] Copy feedback produces clean structured text
- [ ] Gate 3 processes pasted feedback and either updates spec or confirms no change
- [ ] Related docs updated with status notes
