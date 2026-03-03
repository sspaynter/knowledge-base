# Spec-Driven Development — Conventions and Approach

**Last updated:** 2026-03-02
**Design spec:** `docs/plans/2026-03-02-sdd-alignment-design.md`

## What is Spec-Driven Development

Spec-driven development (SDD) is a development paradigm where specifications — not code — are the primary artifact. The spec describes intent in structured, testable language. AI agents generate code to match it. Humans craft the "what" and set guardrails for the "how."

The term emerged in 2025-2026 as AI coding tools matured beyond "vibe coding" (conversational prompting without persistent specs) toward structured, traceable workflows.

### Three Maturity Levels

| Level | Name | Meaning |
|---|---|---|
| 1 | Spec-first | Write a structured spec, then use it to prompt AI to generate code |
| 2 | Spec-anchored | Keep the spec updated as code evolves — spec and code stay in sync |
| 3 | Spec-as-source | The spec IS the primary artifact. Code is generated from it. Humans never edit generated code directly |

Simon's workflow operates at Level 1-2 today, with a clear path to Level 3 for repeatable patterns via spec persistence.

## Industry Tools (March 2026)

### Kiro (AWS)

Three files per feature stored in `.kiro/specs/{feature-name}/`:
- `requirements.md` — user stories with EARS notation acceptance criteria (WHEN/THEN/AND)
- `design.md` — technical architecture, data flow, error handling
- `tasks.md` — checkbox task list mapped to requirements

Kiro also uses a "steering" memory bank: `product.md`, `structure.md`, `tech.md`. Specs are committed to the repo alongside code. Reference in chat via `#spec:feature-name`.

**Traceability:** Tasks "map to" requirements but there is no explicit cross-reference syntax. Relies on AI context to maintain the link.

### GitHub spec-kit

Four phases: specify → plan → tasks → implement. Uses slash commands (`/specify`, `/plan`, `/tasks`). Includes a "constitution" file for immutable architectural rules. Heavy checklist format for tracking compliance. One spec generates approximately 8 files.

### Tessl

Spec-as-source approach. Generated code files include "GENERATED FROM SPEC — DO NOT EDIT." Uses `@generate` and `@test` tags in spec files to control generation. CLI-managed. One-to-one spec-to-code file mapping.

### Key Finding

No tool has shipped an explicit cross-reference syntax between tasks and requirements. The industry relies on AI maintaining context in-session. This is insufficient for workflows that span sessions, projects, or feed into a knowledge base.

## Simon's SDD Alignment

### How Simon's Workflow Maps to SDD

| SDD Concept | Simon's Implementation | Notes |
|---|---|---|
| Constitution | `code-quality`, `infra-context`, `CLAUDE.md` hierarchy | Layered, persistent, project-overridable. More sophisticated than spec-kit's single constitution file. |
| Specify | `pm-feature-spec` skill, `brainstorming` skill | PRD structure with problem statement, MoSCoW requirements, Given/When/Then acceptance criteria. More rigorous than Kiro. |
| Design | Brainstorming output, `product-design` four-gate process | Covers intent exploration, trade-offs, architecture. |
| Tasks | `writing-plans` skill, `pm-breakdown` agent | 2-5 minute granularity with exact file paths and code examples. More precise than any SDD tool. |
| Implement | Builder agent (Sonnet) with TDD | Red-green-refactor enforced. No SDD tool does this. |
| Verify | Reviewer agent with verification-before-completion | Requires actual command output before PASS. Stronger than CI/CD-only verification. |
| Feedback loop | Continuous learning loop, session-end skill checks | Specs improve based on outcomes. Standard SDD is one-directional. |

### Where Simon is Ahead

1. **TDD enforcement** — builder writes failing test first. Industry SDD goes specify → generate → hope tests pass.
2. **Verification with evidence** — reviewer must show real command output before claiming PASS.
3. **Learning loop** — specs feed back into skills based on outcomes (cover letter feedback, scoring calibration).
4. **Multi-layer context** — CLAUDE.md hierarchy (global → project → session) with background skills and agent-specific loading.

### Where the Conventions Add Value

1. **Spec-anchored traceability** — explicit `spec:` references in plan files linking tasks to requirements.
2. **Spec persistence** — generative skills write SPEC.md files alongside generated artifacts, enabling regeneration.

## Convention 1: Spec Reference in Plan Files

Every task in a plan file includes a `spec:` line linking to the design doc section it implements.

**Format:**
```markdown
### Task 3: Build notification service
- spec: requirements.md § US-3 — Email notifications on new match
- files: services/notification.js, routes/notification.js
- acceptance: WHEN a new strong match is saved THEN user receives email within 30 seconds
```

**Rules:**
- `spec:` references use the format `{file} § {section-id} — {human-readable label}`
- Section IDs use prefix conventions: `US-` for user stories, `REQ-` for requirements, `§ Section X.Y` for numbered sections
- WHEN/THEN/AND format for acceptance criteria (EARS notation, aligned to Kiro)
- The `§` separator is visually distinct, grep-friendly, and parseable

**Enforcement:** The `writing-plans` skill includes this in its task template. Every task must have a `spec:` reference.

**KB migration:** Split on ` § ` to extract file and section. Maps to `references` relationship in `asset_relationships` table.

## Convention 2: Spec Persistence for Generative Skills

Every skill that generates an artifact from decisions writes a `{name}-SPEC.md` file alongside the generated artifact.

**Spec file structure:**
```markdown
# [Type] Spec: [Name]

## Decisions
[Key-value pairs of all decisions made during generation]

## References
[Links to other specs, skills, or artifacts that informed the generation]
- spec: {file} § {section} — {label}

## Generated
- Date: YYYY-MM-DD
- Output: {path to generated artifact}
- Skill version: {skill name} v{version}
- Versions: {count and history if iterated}

## Regenerate
[Plain English instructions for reproducing this artifact from this spec]
```

**Where spec files live:** Next to the generated artifact.

| Skill | Location | Filename |
|---|---|---|
| app-scaffold | Project root | `SCAFFOLD-SPEC.md` |
| cover-letter | `applications/{company}/` | `LETTER-SPEC.md` |
| pm-breakdown | Project root | `BREAKDOWN-SPEC.md` |
| product-design | `docs/plans/` | `{date}-{topic}-DESIGN-SPEC.md` |
| writing-plans | Plan file | Embedded in plan file header |

**Regeneration:** If a spec file exists, the skill reads it and uses decisions as defaults instead of interviewing. The user can override any decision.

**KB migration:** Each spec file becomes an asset with type `spec`. References map to `asset_relationships`. Generated section maps to `generates` relationship.

## Skills Already Spec-Compliant

- `pm-feature-spec` — the PRD IS the spec (no additional file needed)
- `brainstorming` — writes design doc to `docs/plans/` (already persists decisions)

## Roadmap

```
SDD skill updates (current)
    → KB v1.1.0 (lifecycle skills)
        → KB rebuild (migrate spec: refs to asset_relationships)
            → KB traceability UI (spec refs visible in browser)
                → Dev tool workflow app (cross-project Kiro-like tool)
                    → Multi-tenant module architecture
```

Each step builds on the previous. The conventions established now are the data format that flows through every subsequent step.

## References

- [Thoughtworks: Spec-driven development (2025)](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)
- [Martin Fowler: Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- [The New Stack: Beyond vibe coding](https://thenewstack.io/vibe-coding-spec-driven/)
- [GitHub Blog: Spec-driven development with AI](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- [Kiro docs: Specs](https://kiro.dev/docs/specs/)
- [Kiro docs: Best practices](https://kiro.dev/docs/specs/best-practices/)
- [Red Hat: How SDD improves AI coding quality](https://developers.redhat.com/articles/2025/10/22/how-spec-driven-development-improves-ai-coding-quality)
- [Built In: Why SDD is the Future](https://builtin.com/articles/spec-driven-development-ai-assisted-software-engineering)
- [Kiro: Future of AI spec-driven development](https://kiro.dev/blog/kiro-and-the-future-of-software-development/)
