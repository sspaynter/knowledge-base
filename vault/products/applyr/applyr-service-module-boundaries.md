---
title: "Service Module Boundary Convention"
status: published
author: both
created: 2026-03-13
updated: 2026-03-13
---

# Service Module Boundary Convention

## Decision

Pure functions in `server/services/` must not transitively import `db.js`, `config.js`, or any module with side effects. When a service file contains both pure logic and infrastructure-dependent orchestration, split it into two files within `services/`:

- `{name}Logic.js` or `{name}Prompts.js` — pure functions only, zero infrastructure imports
- `{name}.js` — orchestration that imports from the logic file plus `db.js`, `ai.js`, etc.

Tests for pure-function files are unit tests that run without environment variables or database connections.

## Context

Session 71 introduced `coverLetterPrompts.test.js` to test the 3-layer cover letter prompt architecture (CRAFT_LAYER, QUALITY_LAYER, buildVoiceSection, etc.). These are pure string-assembly functions with no database dependency.

However, the test file imported `server/services/coverLetter.js` directly. That file's first line — `const { query } = require('../db')` — triggers a chain: `db.js` loads `config.js`, which throws if `SESSION_SECRET` is missing.

Locally this works because `.env` provides the secret. GitHub Actions CI has no `.env`, so the test suite crashes on module load. This produced 9 consecutive CI failures across every push to `dev` during session 71.

The deploy workflow was unaffected (staging received every change), and production was never touched. The impact was noise — failure emails and a red CI badge — but the pattern would recur for any future test that accidentally imports infrastructure modules.

## Alternatives Considered

| Option | Assessment |
|---|---|
| **Create `server/lib/` directory** for pure logic | Rejected. No SS42 project uses `lib/`. The `code-quality` skill says "prefer editing existing patterns over introducing new ones." Would create a convention split across the ecosystem. |
| **Lazy-load db/config inside functions** | Works but unconventional for CommonJS. Makes dependency flow harder to reason about. |
| **Make config.js test-safe** (default `SESSION_SECRET` when `NODE_ENV=test`) | Masks the real issue. Tests should not silently load production infrastructure they do not need. |
| **CI-only fix** (add env vars to GitHub Actions) | Stops the bleeding but does not prevent recurrence. Used as a belt-and-braces safety net alongside the structural fix. |
| **Split within `services/`** | Chosen. Extends the established pattern. No new directories, no new conventions. The `_internal` export hack is removed — functions become proper exports from their own module. |

## Implementation

### 1. Extract pure functions

Move from `coverLetter.js` to `coverLetterPrompts.js`:
- `CRAFT_LAYER` (constant)
- `QUALITY_LAYER` (constant)
- `buildVoiceSection(voiceProfile)`
- `buildSystemPrompt(voiceProfile)`
- `buildRewritePrompt(voiceProfile)`
- `buildAmmunitionContext(ammunition, trackSlug)`

`coverLetter.js` adds one import line and keeps `generateCoverLetter()` and `rewriteCoverLetter()`.

### 2. Update test imports

`coverLetterPrompts.test.js` imports from `../server/services/coverLetterPrompts` instead of accessing `_internal`.

### 3. CI safety net

Add to `.github/workflows/ci.yml`:
```yaml
env:
  SESSION_SECRET: ci-test-dummy
```

This catches future accidental infrastructure imports — they produce a test failure (wrong behaviour) rather than a crash (module load explosion).

### 4. Convention in CLAUDE.md

Add to Applyr `CLAUDE.md` Coding Conventions and to the global `code-quality` skill.

## Architectural Impact

None. The 3-layer prompt architecture (Craft, Quality, Voice) is unchanged. The same functions exist, do the same thing, and are called by the same orchestration code. They move from one file to an adjacent file within the same directory.

The `_internal` export pattern is removed — it was a workaround for testing functions trapped behind infrastructure imports. With the split, functions are proper exports.

## Applies To

This convention applies to all SS42 projects using the Express + CommonJS + `services/` pattern (currently Applyr and Knowledge Base). The rule is encoded in the `code-quality` skill so it propagates to every session and every agent.

## Related

- [Cover Letter Architecture](/page/products/applyr/applyr-cover-letter-architecture) — the 3-layer prompt design this fix preserves
- [Cover Letter Prompt Engineering](/page/products/applyr/applyr-cover-letter-prompt-engineering) — iteration principles
- Sprint task: #175 in `applyr-cl-quality`
