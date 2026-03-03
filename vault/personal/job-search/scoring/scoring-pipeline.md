# Scoring Pipeline

## Overview

Every job listing goes through a two-step AI pipeline before reaching the tracker. This filters out irrelevant roles early (cheap and fast) and only spends detailed scoring on roles worth evaluating.

## Step 1: Triage (Haiku)

**Model:** Claude Haiku 4.5
**Purpose:** Fast binary filter — should this job be scored at all?
**Prompt:** `n8n-prompts/triage-prompt.md` (v3)

The triage step:
- Assigns a track: `product`, `it`, or `skip`
- Checks for red flags (wrong role type, platform-specific, sales disguised as tech, operating not building, physical products, interstate location)
- Returns `proceed: true/false`

Jobs that fail triage are not scored. They may still be inserted with score=0 and verdict=weak as a record.

### Red Flags (v3)

| Category | Examples |
|---|---|
| Wrong role type | SDM, Release Manager, Change Manager, BA, Solutions Architect, Enterprise Architect |
| Platform-specific | SAP, Oracle, Salesforce, Dynamics, TechnologyOne mandatory expertise |
| Sales disguised as tech | MSP sales, practice revenue P&L, pre-sales |
| Operating not building | SLA management, ITIL processes, operational maintenance without transformation |
| Physical products | FMCG, merchandise, sourcing |
| Data governance | Information management, data stewardship (not product roles) |
| Non-Melbourne location | Sydney, Brisbane, Perth, Adelaide, Gold Coast, Canberra, Parramatta, Newcastle, Hobart, Darwin. Accepts: Melbourne, VIC suburbs, "Australia" (ambiguous), Remote, Hybrid |

## Step 2: Scoring (Sonnet)

**Model:** Claude Sonnet 4.6
**Purpose:** Detailed 8-dimension scoring against Simon's profile and preferences
**Prompt:** `n8n-prompts/scoring-prompt.md` (v4)

Each dimension gets a grade (Strong/Moderate/Weak) and a reason. The final score is 0-100.

### Dimensions

1. **Role Fit** — Does the role involve building and transforming, or just operating?
2. **Experience Relevance** — Match against what Simon wants to do, not just what he can do
3. **Seniority Alignment** — Right level? (Flexibility for re-entry strategy)
4. **Domain Match** — Industry and company environment fit
5. **Tech Alignment** — Technology stack and approach alignment
6. **Scope and Complexity** — Transformation mandate, team size, budget authority
7. **Location and Arrangement** — Melbourne, hybrid/remote preference
8. **Compensation** — $150K+ AUD target

### v4 Scoring Changes (Session 13)

| Change | Detail |
|---|---|
| Role Fit boundary tightened | Moderate (2) now requires a genuine transformation component — not just mentioned as a secondary objective. If the JD lists 8 operational responsibilities and 1 transformation bullet, that is Weak, not Moderate. |
| Enterprise penalty | Domain Match Weak (1) now includes large enterprise (>5000 employees) with heavy bureaucratic culture, even if the industry itself is appealing. |
| Design background signal | Experience Relevance Strong (3) boosted if the role involves UX leadership, design systems, or design-engineering collaboration (Simon has interior design + architecture training). |
| Internal capability building signal | Experience Relevance Strong (3) boosted if the role involves building internal tools, platforms, or processes. |

### Verdicts

| Verdict | Score Range | Action |
|---|---|---|
| strong | 75-100 | Written to tracker, email alert |
| possible | 60-74 | Written to tracker |
| weak | 30-59 | Written to tracker (for review) |
| skip | 0-29 | Written to tracker (filtered) |

## Calibration and Refinement History

The scoring pipeline improves through a continuous feedback loop: Simon reviews jobs, his decisions and notes feed back into prompt updates and skill refinements, and the pipeline gets sharper over time.

### Round 1: Initial Calibration (Session 9-10, February 2026)

Simon reviewed 66/76 jobs. Results: 20 YES, 1 MAYBE, 45 NO.

| Metric | Value |
|---|---|
| Agreement rate | 83% (55/66) |
| False positives | 0 (no rejected job passed the filter) |
| False negatives | 11 (Simon would apply, but pipeline filtered) |

Zero false positives means the pipeline does not waste Simon's time with bad matches. The 11 false negatives are mostly borderline roles scoring 47-58, just below the "possible" threshold of 60.

**Outcome:** Triage prompt bumped to v2, scoring prompt bumped to v3. Added red flag categories (SDM, platform-specific, sales disguised as tech). Added identity signals (building language, player-coach, medium-scale companies).

### Round 2: Full Review (Session 12, February 2026)

Simon reviewed all 85 jobs (76 original + 9 new from pipeline). Results: 24 YES, 6 MAYBE, 55 NO.

**New signals identified from Simon's detailed review notes:**

| Signal | Type | Detail |
|---|---|---|
| Design background | Positive | Interior design + architecture training. Differentiator for UX leadership and design-engineering roles |
| AI transformation | Positive | Would accept lower seniority if AI transformation play is strong |
| Internal capability building | Positive | Energised by building internal tools, platforms, processes |
| Medium-sized business | Positive | 100-2000 employees preferred. Large enterprise (>5000) penalised unless transformation mandate |
| "Get stuff done" culture | Positive | Culture language like "bias to action", pragmatic execution |
| Player-coach | Positive | Roles where the leader also builds, not just manages |
| Operating vs building | Negative | Dominant rejection filter (49%). Roles primarily about BAU should be rejected |
| Location filtering | Gap | Non-Melbourne roles were passing triage. Interstate locations (Sydney, Perth, etc.) need to be filtered early |
| Enterprise governance | Negative | Large orgs with committee-heavy, slow governance culture |
| Consultancy sales | Negative | Professional services roles that are primarily sales-driven |

**Outcome:** Skills updated (job-profile, job-evaluate) with new signals, differentiators, and red flags. Triage v3 and scoring v4 planned for session 13 to embed these signals into the n8n pipeline.

---

### Round 3: Re-scoring with v4 Pipeline (Session 13, 27 Feb 2026)

**Trigger:** Scoring prompt updated to v4 and triage prompt to v3. All 32 YES + MAYBE jobs needed comparable scores under the new criteria.

**What was done:**
- Built `scripts/rescore-jobs.py` — a standalone Python script that pulls jobs from NocoDB, scores each via the Anthropic API (Sonnet 4.6, temperature 0), and writes scores back to NocoDB
- Ran all 32 YES + MAYBE jobs through the v4 pipeline
- Cleaned up 5 jobs from the YES list: 1 duplicate (ID 35, Tes Australia), 1 interstate (ID 30, Reo Group Parramatta), 3 scored as skip in v4 (IDs 1, 24, 48)

**Top scores after v4 re-scoring:**

| ID | Score | Track | Company | Role |
|---|---|---|---|---|
| 85 | 76 | product | Upper Echelon Limited | Head of Product |
| 19 | 72 | product | Tes Australia | Senior Product Manager |
| 54 | 72 | it | Robert Walters | GM of Information Technology |
| 72 | 72 | product | Xero | Senior PM — Invoicing & Bills |
| 75 | 72 | it | Daimler Truck | CIO |
| 68 | 68 | product | Tailor | Senior PM — Internal Tools |
| 84 | 65 | product | Removify | Product Experience & Delivery Lead |
| 20 | 63 | product | Coles Group | Group PM — Digital Store Experience |
| 38 | 62 | it | Energy One | Head of IT |
| 64 | 62 | product | Canva | Staff PM — Internal Tools |

**Technical lessons from re-scoring:**
- System prompt extraction must find standalone `---` markers (not inline mentions in text). Use `line.strip() == "---"` to find boundaries.
- `max_tokens: 800` is too short for structured JSON scoring output — responses often exceed 1000 chars. Use 1500.
- NocoDB Verdict column only accepts "strong", "possible", "weak" — map "skip" to "weak" before writing.

**Outcome:** All YES + MAYBE jobs now have comparable v4 scores. Simon selected 4 jobs for the first cover letter batch: Tes Australia (19), Robert Walters (54), Removify (84), Coles Group (20).

**NocoDB schema extended:** Three columns added for the cover letter workflow:
- `Cover Letter` (LongText) — stores the draft text
- `Cover Letter Status` (SingleSelect: draft, feedback, approved, sent)
- `Cover Letter Feedback` (LongText) — Simon's feedback for iteration

**Applications tab deployed:** New tab in the review app showing all YES jobs in a sortable table with score, status dropdown, CL status badges, expandable rows with details. Includes filter buttons (All, Needs CL, Applied, Interviewing) and summary stats.

### Prompt Deployment to n8n (Session 17, 27 Feb 2026)

Both triage v3 and scoring v4 were deployed to the Discovery and Backfill n8n workflows via the n8n API. The deployment used the deactivate/reactivate API cycle to flush n8n's in-memory cache, replacing the previous manual technique of opening the workflow in the n8n UI and pressing Cmd+S.

**Cache flush method:** `POST /api/v1/workflows/{id}/deactivate` then `POST /api/v1/workflows/{id}/activate`. This forces n8n to reload the workflow definition from the database.

The pipeline is now running v3 triage + v4 scoring for all new incoming job alerts.

## Feedback Loop Process

Every time Simon reviews a batch of jobs, the same cycle runs:

1. **Review:** Simon reviews jobs in the review app, marking YES/MAYBE/NO with notes explaining why
2. **Analyse:** Claude reads all review notes, identifies patterns in what Simon accepts and rejects
3. **Refine skills:** Update `job-profile/SKILL.md` and `job-evaluate/SKILL.md` with new signals and criteria
4. **Refine prompts:** Update `triage-prompt.md` and `scoring-prompt.md` with sharpened rules
5. **Deploy:** Push prompt updates to n8n workflows, flush cache
6. **Verify:** Run next batch of jobs through the updated pipeline, compare with Simon's decisions

This loop also runs at the individual job level during applications:
- When Simon provides feedback on a cover letter draft, that feedback refines the understanding of what matters to him
- When Simon skips a job the pipeline scored highly, the reason is captured and fed back into scoring criteria
- When Simon applies to a job the pipeline scored low, the positive signals that were missed get added

The goal is that the pipeline gets sharper with every interaction, not just during formal calibration rounds.

### Identity Signals (what makes Simon say YES)

- Building language: "build from the ground up", "reimagine", "zero-to-one"
- AI/transformation as a differentiator
- Player-coach dynamic (strategy + execution)
- Medium-scale companies (100-2000 employees)
- Growth-stage or inflection-point companies
- Mission connection
- Pragmatic doer language ("bias to action", "get stuff done")
- Design-engineering collaboration
- Internal platform or capability building focus

### Rejection Signals (what makes Simon say NO)

- Operating vs building (49% of rejections)
- Wrong role type (29%)
- Platform-specific expertise required (24%)
- Too corporate/political (22%)
- Consulting/sales disguised as tech (13%)
- Physical products (11%)
- Interstate location without remote option
- IT Service Delivery Manager title
- Large enterprise with slow governance and no transformation mandate
