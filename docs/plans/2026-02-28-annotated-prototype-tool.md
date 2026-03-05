# Annotated Prototype Tool — Plan

> **Status (2026-02-28):** Implemented as Gate 3 of the `product-design` skill at `~/.claude/skills/product-design/SKILL.md`. Option 1 (prompt pattern embedded in skill) was used. This document is retained as reference only.

**Date:** 2026-02-28
**Status:** PENDING — ready to build in a new session
**Priority:** P1 — blocks Gate 2.5 of the product-design skill

---

## What this is

A single-file HTML prototype generator with a built-in annotation layer. Used as Gate 2.5 in the four-gate product design process. Sits between design spec approval and implementation planning.

Full context and rationale: `docs/knowledge-base/product-design-prototype-flow.md`

---

## User Stories — Definition of Done

The primary user is Simon: a product designer/PM reviewing a feature prototype before implementation begins. These stories define what the MVP must do, in priority order.

---

### Story 1 — Open the prototype

**As a designer reviewing a feature, I want to open a self-contained HTML prototype that reflects my design spec, so that I can evaluate the UI without needing a running server or build process.**

Acceptance criteria:
- Given a generated prototype file, when I open it in a browser directly from the filesystem, then all screens load and are accessible — no localhost, no build step required
- Given the prototype is open, when I look at the UI, then the layout, key labels, and structure match the design spec it was generated from
- Given the prototype is open, when I resize the browser, then the layout does not break

---

### Story 2 — Navigate between screens

**As a reviewer, I want to navigate between all screens in the prototype, so that I can evaluate the full user flow end-to-end.**

Acceptance criteria:
- Given the prototype is open, when I click a button or link that routes to another screen, then that screen appears without a page reload
- Given the prototype is open, when I look at the screen switcher, then all screens are listed and I can jump to any screen directly
- Given I navigate to a different screen and back, then my annotations on the previous screen are still present

---

### Story 3 — Annotate any element

**As a reviewer, I want to click any element on any screen and add a short text note, so that I can capture feedback in context without switching to a separate tool.**

Acceptance criteria:
- Given I am viewing any screen, when I click any element (button, label, section, empty area), then a text input appears anchored near that element
- Given the text input appears, when I type a note and press Enter or click Save, then a numbered badge appears on that element and the note is stored
- Given I have added a note, when I click its badge, then the note text is shown or hidden (toggle)
- Given I click a different part of the screen without saving, then the input dismisses without creating a note
- Given I annotate elements across multiple screens, then each screen's annotations are stored independently

---

### Story 4 — Review all feedback in a panel

**As a reviewer, I want to see all my annotations collected in one place, so that I can review the complete set of feedback before exporting.**

Acceptance criteria:
- Given I have added annotations, when I open the notes panel, then all annotations are listed with: annotation number, screen name, element description (auto-captured from tag or label), note text
- Given the notes panel is open, when I click an annotation item, then the prototype navigates to that screen and the annotated element is highlighted
- Given no annotations have been added, when I open the notes panel, then I see a clear empty state: "No notes yet — click any element to annotate"
- Given the notes panel is open, when I resize it or toggle it closed, then the prototype view adjusts cleanly

---

### Story 5 — Export feedback as structured text

**As a reviewer, I want to copy all my annotations as structured text, so that I can paste them directly back into Claude to update the design spec or implementation plan.**

Acceptance criteria:
- Given I have added annotations, when I click "Copy feedback", then all annotations are copied to the clipboard
- Given the copy is successful, when I look at the button, then brief confirmation feedback appears ("Copied!") before reverting to normal
- Given I paste the copied text into a chat, then the output is readable without additional formatting — grouped by screen, with element context and note text

  Expected format:
  ```
  Screen: [Screen name]
  [1] [Element description] — "[Note text]"
  [2] [Element description] — "[Note text]"

  Screen: [Screen name]
  [3] [Element description] — "[Note text]"
  ```

- Given there are no annotations, when I click "Copy feedback", then the button is disabled or produces a clear empty-state message

---

### Story 6 — Clear annotations for a fresh pass

**As a reviewer, I want to clear all annotations so that I can start a new review pass after the design has been updated.**

Acceptance criteria:
- Given I have annotations, when I click "Clear all", then a confirmation prompt appears before any deletion occurs
- Given I confirm, then all annotations are removed, badges disappear from the prototype, and the notes panel shows the empty state
- Given I dismiss the confirmation, then no annotations are deleted

---

## MVP scope boundary

Stories 1–5 are P0. The prototype does not ship without them.

Story 6 (clear annotations) is P1 — useful but the user can reload the page to reset. Not a blocker.

**Out of scope for MVP:**
- Annotation persistence across page reloads
- Exporting as a file (copy to clipboard is sufficient)
- Sharing annotations with others
- Undo / edit existing annotations (delete and re-annotate is acceptable)
- Mobile layout

---

## What to build

### The annotated prototype viewer

Claude generates a single `.html` file containing:

1. **The prototype itself** — a multi-screen, fully clickable representation of the feature being reviewed. Navigation, modals, dropdowns, empty states, and error states all present and clickable.

2. **Annotation layer** — overlaid on top of the prototype UI:
   - Click any element → a text input appears anchored to that element
   - Add a short note ("Missing back button", "What happens if list is empty?", "Wrong label")
   - Note is pinned to that element with a numbered badge
   - Clicking the badge again shows/hides the note

3. **Notes panel** — collapsible side panel listing all annotations:
   - Number, element description (auto-captured), note text
   - Sorted by screen/section

4. **Copy feedback button** — exports all annotations as structured plain text:
   ```
   Screen: Dashboard
   [1] Header nav — "No active state shown for current section"
   [2] Empty state — "What does this look like if no items?"

   Screen: Create modal
   [3] Submit button — "Should this be disabled until form is valid?"
   ```

5. **Screen switcher** — simple top bar or sidebar showing all screens in the prototype. Clicking switches the view.

---

## How it gets used in a session

1. Simon describes the feature or pastes the design spec section
2. Claude generates `prototype-[feature-name].html`
3. Claude runs `open prototype-[feature-name].html` to launch it
4. Simon reviews, annotates, clicks "Copy feedback"
5. Simon pastes feedback into Claude
6. Claude updates the design spec or confirms it holds, then proceeds to Gate 3

---

## Build approach

### Option 1 — Prompt pattern (no formal skill)

Test this first. A repeatable prompt that says:

> "Using the design spec section below, generate a single-file annotated HTML prototype with: multi-screen navigation, a click-to-annotate layer, a notes panel, and a copy-feedback button. Open it with `open [filename].html` when done."

If this works reliably across features, no formal skill is needed. Just use the prompt.

### Option 2 — Formal skill

If the prompt pattern needs consistent structure or additional context (like design system tokens, icon set, etc.), wrap it in a skill:
- File: `~/.claude/skills/product-design/prototype-review/SKILL.md`
- Or extend the existing `product-design` skill with a prototype sub-step

**Recommendation:** Start with Option 1. Build the formal skill only if the prompt pattern proves inconsistent.

---

## Design constraints

- **Single HTML file** — inline all CSS and JS, no external dependencies
- **No server required** — opens directly in a browser from the filesystem
- **No persistence required** — notes do not need to survive a page reload
- **Dark theme preferred** — matches Simon's tooling aesthetic
- **Lucide icons** — consistent with the knowledge-base design system (load via CDN UMD)
- **DM Sans** — UI font (Google Fonts CDN)

---

## What to test

- [ ] Can annotate any clickable and non-clickable element
- [ ] Notes are numbered sequentially
- [ ] Notes panel shows all annotations
- [ ] Screen switching works — annotations persist per screen
- [ ] Copy feedback produces clean, readable structured text
- [ ] File opens correctly from filesystem (no localhost required)
- [ ] Works across a feature with 3+ screens

---

## Session pickup

When building this in a new session:
1. Read this file
2. Read `docs/knowledge-base/product-design-prototype-flow.md` for full context
3. Start with Option 1 (prompt pattern), not a full skill build
4. Test against a real design spec section — use a section from `2026-02-27-knowledge-base-redesign.md` as the test input
5. Iterate until the prototype and annotation layer work cleanly
6. If the pattern is solid, update `product-design-skill-spec.md` Gate 2.5 with the exact prompt pattern to use

---

## Dependencies

None. This is a standalone build. No backend, no database, no deployment.

---

## Related files

| File | Role |
|---|---|
| `docs/knowledge-base/product-design-prototype-flow.md` | Full research, decisions, and rationale |
| `docs/knowledge-base/product-design-skill-spec.md` | Four-gate process — Gate 2.5 already added |
| `docs/plans/2026-02-27-knowledge-base-redesign.md` | Use a section as test input for the first prototype |
