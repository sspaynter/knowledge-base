# Profile Refinement Log

This document tracks how Simon's job search criteria, scoring signals, and preferences evolve over time. Each entry records what changed, why, and what triggered the change.

The scoring pipeline is designed to learn from every interaction with Simon — not just formal calibration rounds.

## How Refinements Happen

| Trigger | What Gets Updated | Example |
|---|---|---|
| Job review batch | Skills (job-profile, job-evaluate), prompts (triage, scoring) | Simon reviews 85 jobs, patterns in YES/NO decisions feed back into criteria |
| Cover letter feedback | job-profile differentiators, cover letter templates | Simon says "emphasise the design angle more" — that signal gets strengthened |
| Application outcome | Scoring weights, red flags | A highly-scored job gets rejected at interview — scoring prompt is reviewed |
| Individual job skip | Negative signals list | Simon skips a job the pipeline scored well — the reason gets captured |
| Individual job apply | Positive signals list | Simon applies to a job scored low — the missed signal gets added |

## Refinement Timeline

### Session 9-10 — Initial Calibration (26 Feb 2026)

**Trigger:** First manual review of 66/76 jobs (20 YES, 1 MAYBE, 45 NO)

**Files updated:**
- `n8n-prompts/triage-prompt.md` — v1 to v2
- `n8n-prompts/scoring-prompt.md` — v2 to v3

**Key changes:**
- Added red flag categories: SDM, platform-specific (SAP/Oracle/Salesforce), sales disguised as tech, operating not building, physical products, data governance
- Added identity signals: building language, player-coach, medium-scale companies, mission connection, pragmatic doer language
- Pipeline agreement rate: 83% (55/66), zero false positives, 11 false negatives (borderline scores 47-58)

**Calibration data:** `analysis-yes-maybe-jobs.md`, `rejection-analysis.md`

---

### Session 12 — Full Review + Skill Refresh (27 Feb 2026)

**Trigger:** Full review of all 85 jobs (24 YES, 6 MAYBE, 55 NO) with detailed notes per job

**Files updated:**
- `.claude/skills/job-profile/SKILL.md` — major rewrite
- `.claude/skills/job-evaluate/SKILL.md` — scoring model replaced

**Changes to job-profile:**

| Area | Before | After | Why |
|---|---|---|---|
| Track 2 target titles | Included "IT Service Delivery Manager" | Removed SDM | SDM is operational, consistently rejected |
| Track 2 filter | No explicit filter | "Operating vs building" as dominant criterion | 49% of NO decisions were "operating not building" |
| Track 1 re-entry | Not mentioned | PO roles accepted as stepping stones | Simon is willing to step down for the right role |
| Location | "Melbourne, Australia" | Melbourne/VIC only, specific interstate exclusions listed | Non-Melbourne roles were passing triage without flagging |
| Company size | Not mentioned | Medium (100-2000) preferred, enterprise (>5000) penalised | Pattern from review: medium businesses consistently score YES |
| Culture signals | Not mentioned | Positive and negative signal lists added | "Get stuff done" vs "committee-heavy" emerged as clear pattern |
| Differentiators | Not mentioned | New section: design background, AI transformation, internal capability building, player-coach, systems thinking | Simon's unique strengths were not captured anywhere |
| Scoring model | Stale 7-dimension table (did not match v3 prompt) | Reference to v3 scoring prompt + primary filter + signal lists | Old model was out of sync with actual pipeline |

**Changes to job-evaluate:**

| Area | Before | After | Why |
|---|---|---|---|
| Scoring model | 7-dimension (0-10 scale) | 8-dimension (Strong/Moderate/Weak, v3-aligned) | Match pipeline prompt for consistency |
| Strong match threshold | 80+ | 70+ | Aligned with pipeline thresholds |
| Red flags | No location section | Location red flags for both tracks (specific cities) | Interstate jobs should be caught early |
| IT red flags | 5 items | 8 items (added SDM, operational, enterprise) | Broader rejection criteria from review |

**Prompt updates planned (session 13):**
- Triage prompt v2 → v3: add location filtering rule
- Scoring prompt v3 → v4: add design background signal, internal capability building, enterprise penalty, tighten operating-vs-building boundary

---

### Session 13 — Prompt Deployment + Re-scoring (27 Feb 2026)

**Trigger:** Implementing the prompt updates planned in session 12, then re-scoring all YES + MAYBE jobs for comparable data under v4 criteria.

**Files updated:**
- `n8n-prompts/triage-prompt.md` — v2 to v3
- `n8n-prompts/scoring-prompt.md` — v3 to v4
- `.claude/skills/job-profile/SKILL.md` — scoring prompt version reference updated to v4

**Changes to triage prompt (v3):**

| Area | Before | After | Why |
|---|---|---|---|
| Location filtering | Vague "Requires relocation outside Melbourne" in General red flags | Explicit city list: Sydney, Brisbane, Perth, Adelaide, Gold Coast, Canberra, Parramatta, Newcastle, Hobart, Darwin | Non-Melbourne roles were passing triage. Needed specific rules, not vague guidance |
| Accept rules | Not specified | Melbourne, VIC suburbs, "Australia" (ambiguous — pass through), Remote, Work from home, Hybrid | Clear pass-through rules for ambiguous or acceptable locations |

**Changes to scoring prompt (v4):**

| Area | Before | After | Why |
|---|---|---|---|
| Role Fit Moderate/Weak boundary | Moderate allowed secondary transformation mention | Moderate requires genuine transformation component — 8 operational responsibilities + 1 transformation bullet = Weak, not Moderate | Too many operational roles were scoring Moderate just for mentioning transformation |
| Domain Match enterprise penalty | Large enterprise not specifically penalised | Weak (1) now includes >5000 employees with heavy bureaucratic culture, slow governance — even if industry is appealing | Large enterprises with no clear building angle consistently rejected in reviews |
| Design background signal | Not present | Experience Relevance Strong (3) boosted for UX leadership, design systems, design-engineering collaboration | Simon's interior design + architecture training is a genuine differentiator for product roles |
| Internal capability building signal | Not present | Experience Relevance Strong (3) boosted for building internal tools, platforms, or processes | Simon is energised by internal tooling — this signal was missing from scoring |

**Re-scoring results:**
- 32 YES + MAYBE jobs re-scored through v4 pipeline using `scripts/rescore-jobs.py`
- 5 jobs removed from YES list: 1 duplicate, 1 interstate, 3 scored as skip
- YES count reduced from ~26 to ~21
- Top scores: Upper Echelon 76, Tes Australia 72, Robert Walters 72, Xero 72, Daimler CIO 72

**NocoDB schema extended:**
- 3 new columns added for cover letter workflow: Cover Letter (LongText), Cover Letter Status (SingleSelect), Cover Letter Feedback (LongText)

**Applications tab deployed:**
- New tab in review app with sortable table, status dropdowns, CL status badges, expandable rows, filter buttons, summary stats

**4 jobs selected for first cover letter batch:** Tes Australia (19), Robert Walters (54), Removify (84), Coles Group (20)

**Prompts deployed to n8n workflows in Session 17** (see entry below).

---

### Session 14 — Cover Letter Skill + First Drafting Cycle (27 Feb 2026)

**Trigger:** First cover letter draft for Tes Australia (ID 19, Senior Product Manager). Four feedback iterations revealed voice and framing preferences.

**Files created:**
- `.claude/skills/cover-letter/SKILL.md` — new skill (Problem-Solution-Evidence framework, voice profile, quality checklist)
- `.claude/skills/cover-letter/ammunition-library.md` — every experience organised by 8 themes
- `.claude/skills/cover-letter/feedback-log.md` — learning mechanism for future letters

**Files updated:**
- `.claude/skills/job-apply/SKILL.md` — now references cover-letter skill, reads both resumes, reads Simon Notes as primary input
- `review-app/index.html` — Job Details tab (two-panel layout with CL review and feedback loop)
- `data-contract.md` — `Cover Letter Version` column added

**Patterns discovered from 4 feedback iterations (Tes Australia):**

| Pattern | Detail | Iteration |
|---|---|---|
| Research beyond the JD | The gap between the job description and the actual company challenge is where the best openings live | v1→v2 |
| Match examples to role type | IT-flavoured examples (Toll CAPEX-OPEX, NEC operating model) do not land for a PM role — use product examples | v1→v2 |
| Intersection differentiators | Simon's real differentiator is rarely one thing. It is the intersection: design instinct + systems/architecture depth + commercial fluency | v2→v3 |
| Always include current activity | Something Simon is doing RIGHT NOW beats historical credentials. When transformation is relevant, weave in AI automation work | v2→v3 |
| Do not frame gap-filling | "I took on the UX designer role" sounds like filling a gap. Frame as breadth that created unique cross-functional value | v2→v3 |
| Customer discovery is core | Discovery is not a phase — it is a working method. When the JD mentions customer insight, lead with Simon's discovery stories | v3→v4 |
| Direct close only | No passive closes ("I would welcome the opportunity"). Template explicitly forbids this | v1→v2 |
| One differentiator per letter | Pick the intersection that matters most, do not bundle all of them | v1→v2 |

**Cover letter feedback log mechanism:** Every piece of feedback is logged and read before drafting any future cover letter. Patterns accumulate across all letters, not just the current one.

**Review app — Job Details tab deployed:** Two-panel layout with draggable resize handle. Left panel: job info, notes, scoring breakdown, full description. Right panel: CL viewer with text selection commenting, edit mode, feedback section, and auto-polling for rewrites. Full feedback loop verified working.

**Model cost observation:** Opus rewrites cost ~$0.20-0.30 each. Plan to switch to Sonnet for rewrite cycles (session 15) — roughly 10x cheaper. First drafts may still use Opus. The feedback log ensures voice consistency regardless of model.

---

### Session 15 — Cover Letter Batch + Resume Refresh (27 Feb 2026)

**Trigger:** Drafted cover letters for remaining 3 jobs. Updated both resumes with SS Automation 2026 AI consulting entry and AI-forward positioning.

**Cover letters drafted (all v1, draft status):**

| ID | Company | Role | Angle | Key Experience Selected |
|---|---|---|---|---|
| 54 | Robert Walters | GM of IT | Vendor governance + automation transformation | UXC Connect ($90M, 70 staff), NEC XaaS team build, Toll vendor management, AI automation current work |
| 84 | Removify | Product Experience & Delivery Lead | Design-trained PM, systems thinking, discovery-driven | Datacom Cloud X Flex, NEC WA Gov turnaround, JB HiFi DaaS, design background + AI prototyping |
| 20 | Coles Group | Group PM Digital Store Experience | Physical-digital threshold, 50+ BU transformation | Toll 50+ BUs, NEC XaaS consolidation, Datacom onboarding automation, Clinuvel process transformation |

**Ammunition library updated:**
- Added SS Automation 2025–Present to Theme 1 (Platform Building) and Theme 3 (Automation and AI)
- Entry: AI Consultant, helping businesses build practical AI capability — automation agents, back-office workflows, internal tools, prototyping, structured pipelines

**Resume changes (both tracks):**
- New role entry: SS Automation | AI Consultant | 2025–Present
- Updated objectives with AI automation angle
- Updated executive profiles with hands-on AI building narrative
- New core capability: AI-Powered Automation, Agent Design & Process Transformation
- PM resume formatted programmatically (heading hierarchy, spacing, ATS fixes)
- IT Manager resume changes identified but not yet applied

**Skills updated (Session 15 close):**
- `job-evaluate` — aligned dimension weights with scoring-prompt v4, added design background and internal capability building signals, added core identity framing
- `job-apply` — added MASTER file references, python-docx resume customization workflow, per-job resume persistence to `applications/{company}/`
- `job-profile` — added SS Automation 2026 current work, ammunition library reference, MASTER file paths

**Process improvement identified:** Session-end skill checks should be mandatory and assertive, not optional offers. Updated session management rules in MEMORY.md and simon-context.

---

## Signals Reference

### Positive Signals (boost score)

| Signal | First Identified | Source |
|---|---|---|
| Building language ("reimagine", "zero-to-one") | Session 9 | Review analysis |
| AI/transformation differentiator | Session 12 | Simon's review notes |
| Player-coach dynamic | Session 9 | Review analysis |
| Medium-sized business (100-2000) | Session 12 | Pattern from YES decisions |
| Design-engineering collaboration | Session 12 | Simon's differentiator |
| Internal platform / capability building | Session 12 | Simon's review notes |
| "Get stuff done" culture language | Session 12 | Pattern from YES decisions |
| Mission connection | Session 9 | Review analysis |
| Growth-stage or inflection-point | Session 9 | Review analysis |

### Negative Signals (reduce score)

| Signal | First Identified | Source |
|---|---|---|
| Operating vs building | Session 9 | 49% of rejections |
| Platform-specific expertise (SAP, Oracle) | Session 9 | 24% of rejections |
| Too corporate/political | Session 9 | 22% of rejections |
| Consulting/sales disguised as tech | Session 9 | 13% of rejections |
| Interstate location (no remote) | Session 12 | Location gap identified |
| Enterprise >5000 without transformation | Session 12 | Pattern from NO decisions |
| SDM title | Session 9 (red flag), Session 12 (removed from targets) | Consistently rejected |
| Committee-heavy governance | Session 12 | Simon's review notes |

---

## Session 16 — LinkedIn Profile Alignment (2026-02-27)

**Trigger:** LinkedIn About Me review revealed misalignment between profile positioning and updated resume/CL messaging.

**Changes made:**
- `job-profile/SKILL.md`: Design background differentiator expanded — now includes full path (interior design training → architecture practice → multimedia/web business → IT). Adds context that Simon was doing UX before the term existed.
- `cover-letter/feedback-log.md`: LinkedIn voice calibration entry added — "intersection of X, Y, Z" patterns flagged as consultancy-speak, not Simon's voice. "I care about how these things get embedded properly" is his natural register.
- LinkedIn About Me: v3 drafted and approved. Key positioning: builder identity, self-refining AI pipelines, corrected design background story, "Ready to build" close.
- LinkedIn headline, top skills, Open to Work roles, and SSA experience description all recommended for update.

**Files updated:** `job-profile/SKILL.md`, `cover-letter/feedback-log.md`
**Not yet updated in n8n:** No pipeline changes this session.

---

### Session 17 — n8n Deployment + Tes CL Approved + Review App Fixes (27 Feb 2026)

**Trigger:** Deploying triage v3 + scoring v4 to n8n, iterating Tes Australia CL to approval, fixing review app bugs discovered during CL feedback cycles.

**n8n Prompt Deployment:**
- Both Discovery (`6p2qClZtpnJX5zgK`) and Backfill (`VhVowq1g60AG0AJ6`) workflows updated via n8n API
- Triage v3 and Scoring v4 prompts now live in the automated pipeline
- **Key discovery:** Deactivate/reactivate API calls flush n8n's in-memory cache. `POST /api/v1/workflows/{id}/deactivate` then `POST /api/v1/workflows/{id}/activate`. This replaces the previous manual Cmd+S technique.

**Tes Australia CL v4→v8 (APPROVED):**
- 8 iterations total. Body paragraphs stable from v5. All iteration was on the opening paragraph.
- Final approved opening: "When I was researching Tes to understand the business and where my experience could add value, what stood out was the scale of the product integration challenge."

| Pattern | Detail | Iteration |
|---|---|---|
| Opening from Simon's research process | Do not open with an assertion about the company. Open with Simon's research process — what he noticed, what stood out, what his reading of the situation is | v4→v8 |
| Do not introduce unverifiable company facts | If Simon has not confirmed a fact (e.g. "Education Horizons integration is not a brand exercise"), do not state it as if true | v6→v7 |
| "The way I read it..." hedging | When making an interpretive claim about a company's challenge, hedge it as Simon's reading — not a statement of fact | v7→v8 |
| Body paragraphs stabilise early | Once the evidence stories are right, they do not change. All iteration is on framing and opening | v5→v8 |

**CL Review Against Updated Resumes:**
- Robert Walters (ID 54): Aligned — IT track examples match GM of IT role
- Removify (ID 84): Aligned — design background, discovery, systems thinking match Product Experience role
- Coles Group (ID 20): Needs v2 — should incorporate AI/SS Automation angle from updated resume

**Review App Fixes:**
- Polling render order bug: `renderDetailsPage()` was called before `startCLPoll()`, causing "Polling stopped" to appear immediately on Send for Rewrite. Fixed by swapping call order.
- Description section parser: Added inline header normalization for single-line descriptions (regex lookbehind patterns that detect common JD section headers within a single line and inject newlines before them). Most job descriptions are multi-line, but Tes Australia (IDs 13, 19) had single-line descriptions that broke the parser.

**Files updated:**
- `review-app/index.html` — polling fix + description parser fix
- `.claude/skills/cover-letter/feedback-log.md` — v7→v8 and v8 APPROVED entries

---

### Session 17b — Applyr Product Design Brainstorm (27 Feb 2026)

**Trigger:** Simon wanted to define the review app replacement as a proper product with a full specification. This was a brainstorming session, not a pipeline/scoring session.

**Key decision: The review app is being replaced by Applyr.**

Applyr is a job application platform that takes users from "I got a job alert" to "I have applied with a personalised cover letter and tailored resume" — and tracks the outcome. The core differentiator is the learning loop.

**Design spec created:** `docs/plans/2026-02-27-applyr-design.md` (v0.1)

**Product decisions captured:**
- Multi-user from the start (friends/testers, each with their own profile and pipeline)
- Node/Express + PostgreSQL + vanilla JS (same stack as KB project)
- Google OAuth via Passport.js
- Self-hosted on NAS, Cloudflare Tunnel (jobs.ss-42.com)
- Email forwarding for job import (jobs@ss-42.com)
- AI costs on Simon's API key initially
- Feedback loop + chat for AI-assisted CL/resume writing

**Information architecture approved:**
- Collapsible sidebar: Workspace (Home, Pipeline, Review Queue), Insights (Metrics, Preparation), System (Settings, Help)
- Job Detail with 5 tabs: Overview, Research, Cover Letter, Resume, Application
- Persistent context panel across all Job Detail sub-pages
- Cmd+K global search, notification bell, + Add Job button

**Additional features scoped:** Contact tracking, interview preparation, duplicate detection, company preferences, job comparison, email drafts, salary intelligence, keyboard shortcuts, archive/history, resume ATS review, system health notifications, help/instructions

**Remaining spec sections for session 18:** Visual design, data model, API design, settings/admin, build context, open questions. Also: HTML clickable prototype mockup.

**No files updated in skills or prompts.** This was a design-only session.
