---
author: both
order: 230
status: draft
title: design-standards — Frontend Design Quality Rules
---


# design-standards — Skill Research and Design

**Type:** Claude skill (background quality — loads during frontend work)
**Status:** Research complete, awaiting planning and build
**Planned location:** `~/.claude/skills/design-standards/SKILL.md`
**Upstream source:** [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT, 3.5k stars)
**MASTER-TODO:** #207 (S22)

---

## Origin

The [taste-skill](https://github.com/Leonxlnx/taste-skill) repo by Leonxlnx contains four SKILL.md files designed to prevent AI tools from generating generic, template-like frontend code. They were built for Cursor's `@file` reference pattern and assume React/Next.js + Tailwind CSS.

Simon reviewed these in session 12 (2026-03-17) to understand how they could improve his prototype and build workflow. The conclusion: the creative direction in the existing `frontend-design` plugin is good, but it lacks specific, actionable rules. The taste-skill files provide those rules.

### The four upstream skills

| Skill | What it does | Verdict |
|---|---|---|
| **taste-skill** | Comprehensive design engineering rules — typography, colour, layout, motion, anti-patterns. React/Tailwind-specific. Three configurable dials (variance, motion, density). | Extract principles, discard framework-specific implementation |
| **soft-skill** | Premium agency-level aesthetics — double-bezel cards, magnetic buttons, haptic micro-interactions, three vibe archetypes. Heavy Tailwind. | Fold useful surface treatment rules into design-standards. Discard the persona framing and over-specific component recipes |
| **redesign-skill** | Audit checklist for existing projects — typography, colour, layout, interactivity, content, iconography, code quality. Framework-agnostic. Fix priority order. | Most directly useful. Adapt the audit categories as the skill's quality rules |
| **output-skill** | Enforces code completeness — no placeholder comments, no TODO stubs, no incomplete blocks | Redundant — already covered by `code-quality` skill |

---

## What the skill would own

Concrete visual design quality rules that prevent generic AI output. This is the gap between `frontend-design` (creative direction and attitude) and `code-quality` (code structure and security).

### Ownership boundaries

| Domain | Owner | Adjacent (do NOT duplicate) |
|---|---|---|
| Visual design anti-patterns and quality rules | **design-standards** | frontend-design (creative direction), code-quality (code structure) |
| Creative direction, aesthetic tone, boldness | frontend-design | design-standards (specific rules) |
| AI prose cliches in UI copy | anti-slop | design-standards (UI content realism — fake names, round numbers) |
| Coding standards, semantic HTML, alt text | code-quality | design-standards (visual rules only) |

### What it covers

**1. Typography system**
- Use a typographic scale with defined ratios, not arbitrary sizes
- Headlines: tighter letter-spacing, reduced line-height, weight hierarchy beyond 400/700
- Body: max ~65 characters wide, relaxed line-height
- Use Medium (500) and SemiBold (600) for subtle hierarchy
- Tabular figures for numbers (`font-variant-numeric: tabular-nums`)
- `text-wrap: balance` for orphaned words
- No browser default fonts, no Inter everywhere

**2. Colour discipline**
- Maximum one accent colour, saturation under 80%
- No pure `#000000` — use off-black or tinted dark
- No purple/blue "AI gradient" aesthetic
- Stick to one gray family — don't mix warm and cool grays
- Tint shadows to background hue, never pure black at low opacity
- Consistent lighting direction across all shadows

**3. Layout anti-patterns**
- No three-equal-card feature rows — use asymmetric grid, zig-zag, or horizontal scroll
- No centred hero when layout variance is desired — use split-screen or left-aligned
- Use `min-height: 100dvh` not `height: 100vh` (iOS Safari viewport bug)
- Container constraint (1200-1440px) with auto margins
- Vary border-radius — tighter on inner elements, softer on containers
- Use negative margins for layering and depth
- Optical alignment over mathematical alignment (1-2px adjustments)

**4. Surface treatment**
- Cards only when elevation communicates hierarchy — otherwise use spacing or borders
- True glassmorphism: backdrop-blur + 1px inner border + subtle inner shadow
- Grain/noise overlays for texture (on fixed, pointer-events-none elements only)
- Coloured, tinted shadows over generic black
- No flat design with zero texture — add subtle noise, grain, or micro-patterns

**5. Mandatory interactive states**
- Skeleton loaders matching layout shape (not generic spinners)
- Composed empty states indicating how to populate
- Clear, inline error messages (not `window.alert()`)
- Active/pressed feedback: subtle `scale(0.98)` or `translateY(1px)` on press
- Visible focus rings for keyboard navigation
- Smooth scroll (`scroll-behavior: smooth`) on anchor clicks
- All transitions 200-300ms minimum on interactive elements

**6. Content realism**
- No generic names ("John Doe", "Jane Smith") — use diverse, realistic names
- No round numbers (`99.99%`, `$100.00`) — use organic data (`47.2%`, `$99.00`)
- No placeholder company names ("Acme Corp", "Nexus")
- No Lorem Ipsum — write real draft copy
- Sentence case headers, not Title Case
- No exclamation marks in success messages
- No "Oops!" error messages — be direct

**7. Motion and animation**
- Never animate `top`, `left`, `width`, `height` — use `transform` and `opacity` only
- Apply `backdrop-blur` only to fixed/sticky elements, never scrolling containers
- No linear easing — use custom cubic-bezier or spring physics
- Staggered entry animations — elements cascade in with slight delays
- Scroll-driven reveals via IntersectionObserver, never `window.addEventListener('scroll')`
- Apply grain/noise filters to fixed pseudo-elements only (prevent GPU repaints)

**8. Fix priority order** (for design reviews)
1. Font swap — biggest instant improvement, lowest risk
2. Colour palette cleanup — remove clashing or oversaturated colours
3. Hover and active states — makes the interface feel alive
4. Layout and spacing — proper grid, max-width, consistent padding
5. Replace generic components — swap cliche patterns for modern alternatives
6. Add loading, empty, and error states — makes it feel finished
7. Polish typography scale and spacing — the premium final touch

### What it does NOT cover

- Creative direction or aesthetic tone selection (frontend-design)
- Code structure, semantic HTML, security, alt text requirements (code-quality)
- Prose writing cliches — "elevate", "seamless", "unleash" (anti-slop)
- Framework-specific architecture — RSC safety, state management patterns (taste-skill upstream content, not carried forward)
- Specific component recipes — bento grids, magnetic buttons, parallax cards (too prescriptive for a quality skill)

---

## How it fits the pipeline

### Loading pattern

Background quality skill — loads silently when builder agent is doing frontend work. Same pattern as `code-quality` but scoped to visual design.

### Pipeline integration

```
Brainstorm → Prototype → Plan → Build → Staging → Verify → Release
                ↑                   ↑
          design-standards    design-standards
          loaded during       loaded by builder
          prototype work      for implementation
```

No new pipeline gate. The skill improves output quality at existing stages, not adds a review step.

### Agent wiring

- **Builder agent:** Add `design-standards` to frontend task context alongside `code-quality` and `infra-context`
- **Reviewer agent:** Reference fix priority order when reviewing frontend changes
- **Prototyper agent** (when built, #128): Load alongside `frontend-design`

---

## Adaptation notes

### What was stripped from upstream

- All React/Next.js/RSC architecture (Server Components, `'use client'` isolation)
- Tailwind-specific syntax and version guards (v3 vs v4 config)
- Framer Motion animation API specifics (`useMotionValue`, `useTransform`, `AnimatePresence`)
- The dial system (DESIGN_VARIANCE, MOTION_INTENSITY, VISUAL_DENSITY) — over-engineered for a quality skill
- The bento paradigm section (Section 9 of taste-skill) — too prescriptive
- The creative arsenal menu (Section 8 of taste-skill) — component recipes belong in inspiration, not rules
- The soft-skill's persona framing ("$150k agency", "Vanguard_UI_Architect")
- The anti-emoji policy (unnecessary constraint)
- shadcn/ui customisation rules (not in current stack)

### What was kept

- All framework-agnostic design principles
- The anti-pattern lists (AI tells, banned patterns)
- The fix priority order from redesign-skill
- Typography system rules
- Colour calibration rules
- Surface treatment principles
- Interactive state requirements
- Content realism rules
- Performance guardrails for animation

### Stack considerations

Simon's current frontend stack is Hugo + vanilla CSS (SSA website). Future projects will likely use React/Next.js + Tailwind. The skill should be framework-agnostic in its rules, with optional implementation notes for both stacks where relevant:
- Vanilla CSS: custom properties, media queries, standard animation
- React/Tailwind: utility classes, component patterns, motion libraries

---

## Relationship to frontend-design plugin

The `frontend-design` plugin (by Anthropic, installed via marketplace) provides creative direction — "be bold, pick a tone, make it memorable." It is good at setting attitude but vague on specifics.

`design-standards` provides the concrete rules that make "be bold" actionable:

| Aspect | frontend-design says | design-standards adds |
|---|---|---|
| Typography | "Choose fonts that are beautiful" | Use a scale with defined ratios. Max 65ch body. Tabular figures for numbers. |
| Colour | "Dominant colors with sharp accents" | Max 1 accent. Saturation < 80%. No pure black. Tint shadows. |
| Layout | "Unexpected layouts. Asymmetry." | Ban 3-card rows. No centred hero unless intentional. Use dvh not vh. |
| Motion | "Use animations for effects" | Only transform and opacity. No blur on scrolling. Custom easing. |
| Content | — | No fake names. No round numbers. No Lorem Ipsum. Sentence case. |
| States | — | Skeleton loaders, empty states, error states, press feedback mandatory. |

The two skills complement each other: frontend-design sets direction, design-standards enforces quality. Neither duplicates the other.

---

## Next steps

1. **Plan** — use `writing-plans` skill to create build plan with seven-field task format
2. **Build** — create `~/.claude/skills/design-standards/SKILL.md` following skill lifecycle
3. **Register** — add to KB asset registry, write this vault article to published status
4. **Wire** — add `@` reference to builder agent for frontend tasks
5. **Update skills-overview** — add to Category 2 (Quality skills) table and ownership map

---

## Related documents

- Skill overview and lifecycle: `operations/engineering-practice/skills/skills-overview.md`
- anti-slop skill reference: `operations/engineering-practice/skills/anti-slop.md`
- code-quality skill (code structure owner): `~/.claude/skills/code-quality/SKILL.md`
- frontend-design plugin: `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/SKILL.md`
- Upstream repo: [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)
- MASTER-TODO: #207 (S22)
