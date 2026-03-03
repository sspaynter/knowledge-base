# Job Search Automation — Architecture Overview

## What This System Does

Automated job discovery and scoring pipeline that finds relevant product management and IT leadership roles from LinkedIn and Seek job alerts, scores them against Simon's preferences using AI, and presents them for review.

**Applyr status (Phase 3 complete — 2026-03-03):** Deployed to staging at `https://applyr-staging.ss-42.com`. Phase 1: Google OAuth, Jobs API, Pipeline API, frontend SPA (pipeline board/list/table, job detail). Phase 2: Review Queue (list + detail + keyboard shortcuts), Context Panel, Archive view, 92 tests. Phase 3: AI service wrapper (per-user Anthropic API key from user_settings), company research (7-section Claude Sonnet generation, stored in company_research table), cover letter generation + versioned rewrites (cover_letters table), Research and Cover Letter tabs in job detail, inline text-selection annotation on CLs (select text → floating popup → note → highlights panel compiled into rewrite feedback), auto-trigger research + CL on "interested" decision, 131 tests across 9 files. Next: Phase 3b UI polish (research missing sections, icons), then Settings API key UI, then Phase 4 (Resume + Application). Design spec: `docs/plans/2026-02-27-applyr-design.md`. Implementation plan: `docs/plans/2026-03-02-applyr-implementation-plan.md`. Source: `~/Documents/Claude/applyr/` (repo: `sspaynter/applyr`).

## How It Works

There are two layers:

### Automated Layer (n8n on QNAP NAS)

Runs continuously. Processes job alert emails from Gmail, scores each listing through a two-step AI pipeline, and writes results to PostgreSQL.

```
Gmail (Seek/LinkedIn alerts)
  |
  v
n8n (scheduled trigger)
  |-- Parse email, extract job listings
  |-- Fetch full job descriptions from source
  |-- Step 1: Triage with Haiku (fast filter — track assignment, red flags)
  |-- Step 2: Score with Sonnet (8-dimension detailed scoring)
  |-- Write to PostgreSQL (upsert on URL)
  v
NocoDB (web UI over PostgreSQL)
  |-- Grid view: sortable table of all jobs
  |-- Gallery view: card-based review
  |-- Kanban view: pipeline by status
```

### Interactive Layer (Claude Code)

On-demand. Simon runs commands to search job boards, draft applications, research companies, and prepare for interviews.

```
Simon
  |
  v
Claude Code
  |-- /job-search: browse LinkedIn + Seek via Chrome
  |-- /job-apply: draft cover letters and resume suggestions
  |-- /job-followup: draft follow-up emails
  |-- Company research agent
  |-- Interview prep agent
  |
  v
n8n webhook --> PostgreSQL (same database)
```

## Infrastructure

All backend services run on a QNAP NAS on the local network.

| Service | Container | LAN URL | Purpose |
|---|---|---|---|
| n8n | `n8n` | `http://192.168.86.18:32777` | Workflow automation |
| n8n (external) | via Cloudflare Tunnel | `https://n8n.ss-42.com` | Remote access |
| PostgreSQL | `n8n-postgres` | `10.0.3.12:5432` | Database (shared) |
| NocoDB | `nocodb` | `http://192.168.86.18:32778` | Database web UI |
| Job Review App | `job-review-app` | `http://192.168.86.18:8082` | Custom review interface |

All containers are on the Docker bridge network and can reach each other via internal IPs.

## Data Flow

There is one database (`nocodb` on PostgreSQL) and one `jobs` table. Everything writes to the same place:

- n8n automated pipeline writes scored jobs via SQL (INSERT ... ON CONFLICT upsert)
- Claude Code writes captures via n8n webhook (which routes to the same SQL)
- NocoDB provides a web UI over the same table
- The review app reads and writes via NocoDB's REST API
- The re-scoring script (`scripts/rescore-jobs.py`) reads from NocoDB and scores via Anthropic API, writing results back to NocoDB

This means there is a single source of truth. No syncing, no duplicate data.

## Review App Tabs

The review app (`review-app/index.html`) is a single-file HTML application that talks to NocoDB's REST API. It has four tabs:

1. **Review** — Card-based interface for reviewing jobs. Shows job details, scoring breakdown, and allows YES/MAYBE/NO verdicts with notes.
2. **Applications** — Pipeline view of all YES jobs. Sortable table with score, status dropdown (interested → applied → interviewing → offered → rejected → withdrawn), CL status badges. Clicking a row opens the Job Details tab for that job. Filter buttons: All, Needs CL, Applied, Interviewing. Auto-sets Applied Date when status changes to "applied".
3. **Job Details** — Two-panel detail view that opens when clicking a job row in Applications. Left panel: job header, quick info, Simon's notes, scoring breakdown (parsed from JSON), full job description (all scrollable). Right panel: cover letter viewer with version indicator and status badge, text selection commenting (highlight → add inline comment), edit mode toggle, feedback section, and action buttons (Save Edits, Send for Rewrite, Approve). Includes a draggable resize handle between panels (default 840px left, persists across re-renders). When "Send for Rewrite" is clicked, the app saves feedback to NocoDB, sets status to "feedback", and starts polling every 5 seconds for changes — when it detects a new version, it refreshes automatically.
4. **Scoring Criteria** — Read-only display of the triage and scoring prompts for reference.

## Cover Letter Workflow

The `jobs` table includes four columns for cover letter management:

| Column | Type | Purpose |
|---|---|---|
| Cover Letter | LongText | Stores the draft cover letter text |
| Cover Letter Status | SingleSelect | Tracks the lifecycle: draft → feedback → approved → sent |
| Cover Letter Feedback | LongText | Simon's feedback for Claude to iterate on |
| Cover Letter Version | Number (default 1) | Tracks iteration count |

**Skill-driven drafting:** The cover-letter skill (`.claude/skills/cover-letter/`) drives every draft. It uses a Problem-Solution-Evidence framework — name the company's challenge, show a parallel problem you solved, state what you will deliver. The skill includes:
- Writing rules and Simon's voice profile
- An ammunition library of every quantifiable experience organised by 8 themes
- A feedback log that accumulates patterns from every review cycle

**Process:**
1. Claude reads the job description, Simon's notes, both resumes (track + long), and the ammunition library
2. Claude researches the company (web search for recent news, products, strategic context)
3. Claude selects 2-3 experiences that map to the role's top needs
4. Claude drafts the letter and writes to NocoDB (status: draft, version: 1)
5. Simon reviews in the Job Details tab — highlights text to add inline comments, writes general feedback
6. Simon clicks "Send for Rewrite" — feedback saved to NocoDB, status set to "feedback"
7. The review app polls NocoDB every 5 seconds, waiting for changes
8. Claude reads feedback, rewrites the letter, increments the version, saves back
9. The review app detects the change, refreshes, shows the new version
10. Loop continues until Simon approves

**Learning loop:** Every piece of feedback is logged in `cover-letter/feedback-log.md`. This log is read before drafting ANY future cover letter, so patterns discovered during one letter (voice preferences, framing rules, experience selection insights) improve all subsequent letters.

**Cover letter status (as of session 17):**
- Tes Australia (ID 19) — **Approved** v8. 8 iterations to nail the opening. Body stable from v5.
- Robert Walters (ID 54) — Draft v1, aligned with updated resume.
- Removify (ID 84) — Draft v1, aligned with updated resume.
- Coles Group (ID 20) — Draft v1, needs v2 with AI/SS Automation angle from updated resume.

## Resume Management

Resumes are managed as MASTER templates with per-job customization:

| Track | MASTER File | Archive |
|---|---|---|
| Product Manager | `files/resumes/Product Manager/MASTER - Product Manager.docx` | `files/resumes/Product Manager/archive/` |
| IT Manager | `files/resumes/IT Manager - Head of IT/MASTER - IT Manager.docx` | `files/resumes/IT Manager - Head of IT/archive/` |
| Long (reference) | `files/resumes/Simon Paynter resume 2026 - long.docx` | N/A |

**Per-job customization workflow:**
1. Copy the track MASTER to `applications/{company-name}/Simon Paynter - Resume 2026.docx`
2. Use `python-docx` to make targeted adjustments (reorder bullets, add keywords, emphasise relevant experience)
3. Preserve formatting hierarchy: company headings 11pt bold (6pt space_before), subtitles 10pt italic, sub-roles 10.5pt bold (4pt space_before)

**Font sizes in EMU:** 139700 = 11pt, 133350 = 10.5pt, 127000 = 10pt

The `python-docx` library reads and writes .docx files with a verified round-trip that preserves formatting. This was established in Session 15 and replaces the previous manual-only workflow.

## Two Role Tracks

The system scores jobs against two tracks:

1. **Product Management** — building software, applications, digital products
2. **Head of IT / IT Manager** — leading IT teams, operations, technology strategy

The triage step assigns each job to a track (or skips it). The scoring step evaluates against track-specific criteria.

## Scoring Pipeline Detail

See [Scoring Pipeline](scoring-pipeline.md) for the full breakdown of how jobs are triaged, scored, and classified.

## Continuous Learning Loop

The system is designed to get sharper over time. Every interaction with Simon feeds back into the scoring criteria:

```
Pipeline scores jobs
  → Simon reviews in review app (YES/NO + notes)
  → Claude analyses patterns in decisions
  → Skills updated (job-profile, job-evaluate)
  → Prompts updated (triage, scoring)
  → Pipeline deployed to n8n
  → Next batch of jobs scored with refined criteria
```

This also runs at the individual level during applications — cover letter feedback, interview outcomes, and skipped-job reasons all feed back into the profile.

See [Profile Refinement Log](profile-refinement-log.md) for the full history of how criteria have evolved.

## Key Files

| File | Purpose |
|---|---|
| `review-app/index.html` | Custom review interface (served by nginx). Tabs: Review, Applications, Job Details, Scoring Criteria |
| `n8n-prompts/triage-prompt.md` | Haiku triage prompt (v3) — deployed to n8n workflows |
| `n8n-prompts/scoring-prompt.md` | Sonnet scoring prompt (v4) — deployed to n8n workflows |
| `docs/plans/2026-02-27-applyr-design.md` | Applyr product design specification (complete, 14 sections) |
| `docs/plans/2026-03-02-applyr-implementation-plan.md` | Applyr implementation plan (7 phases, 56 tasks) |
| `data-contract.md` | Database schema and field validation rules |
| `.claude/skills/job-profile/SKILL.md` | Simon's profile, differentiators, and evaluation criteria |
| `.claude/skills/job-evaluate/SKILL.md` | Interactive scoring rubric (aligned with pipeline) |
| `.claude/skills/cover-letter/SKILL.md` | Cover letter writing skill — framework, voice profile, quality checklist |
| `.claude/skills/cover-letter/ammunition-library.md` | Every quantifiable experience organised by theme for cover letter selection |
| `.claude/skills/cover-letter/feedback-log.md` | Accumulated patterns from cover letter review cycles |
| `.claude/skills/job-apply/SKILL.md` | Application drafting skill — references cover-letter skill and ammunition library |
| `docs/profile-refinement-log.md` | History of how scoring criteria evolve over time |
| `scripts/parse-alert-email.js` | Email parser for Seek and LinkedIn alerts |
| `scripts/rescore-jobs.py` | Batch re-scoring script — pulls jobs from NocoDB, scores via Anthropic API, writes back |
