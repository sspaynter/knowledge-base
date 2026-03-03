# Data Contract — Job Search Tracker

Single source of truth for the job tracker schema, status lifecycle, and field definitions. Referenced by both Claude Code skills and n8n workflow prompts.

## Schema

| Column | Type | Required | Description |
|---|---|---|---|
| date_found | YYYY-MM-DD | Yes | Date the job was first found |
| track | string | Yes | `product` or `it` |
| role | string | Yes | Job title as listed |
| company | string | Yes | Employer name (not recruiter, unless employer is confidential) |
| salary_min | number | No | Lower bound of salary range (empty if not listed) |
| salary_max | number | No | Upper bound of salary range (empty if not listed) |
| salary_notes | string | No | e.g., "plus super", "package", "TBC", "contract daily rate" |
| type | string | Yes | `permanent`, `contract`, `fixed-term` |
| arrangement | string | Yes | `hybrid`, `remote`, `on-site` |
| location | string | Yes | Suburb or area (e.g., "Melbourne CBD", "Cremorne", "Remote") |
| source | string | Yes | `linkedin`, `seek`, `indeed`, `other` |
| url | string | Yes | Direct URL to the listing |
| score | number | Yes | Evaluation score out of 100 |
| verdict | string | Yes | `strong`, `possible`, `weak` |
| status | string | Yes | Current application status (see Status Lifecycle below) |
| applied_date | YYYY-MM-DD | No | Date application was submitted (empty until applied) |
| notes | string | No | Free text — key observations, concerns, follow-up items |
| source_pipeline | string | Yes | `manual` (Claude Code) or `automated` (n8n) |
| cover_letter | text | No | Cover letter draft content |
| cover_letter_status | string | No | `draft`, `feedback`, `approved`, or `sent` |
| cover_letter_feedback | text | No | Simon's feedback for Claude to iterate on |
| cover_letter_version | number | No | Version counter, incremented on each rewrite (default 1) |

## Status Lifecycle

```
new ──► interested ──► applied ──► interviewing ──► offered
 │          │            │             │               │
 │          │            │             │               └──► (end state)
 │          │            │             │
 │          │            │             └──► rejected (end state)
 │          │            │
 │          │            └──► rejected (end state)
 │          │
 │          └──► withdrawn (end state)
 │
 └──► archived (end state)
```

### Valid Transitions

| From | To | Trigger |
|---|---|---|
| new | interested | Simon flags for follow-up |
| new | archived | Role is stale or irrelevant |
| interested | applied | Application submitted |
| interested | withdrawn | Simon decides not to proceed |
| applied | interviewing | Interview confirmed |
| applied | rejected | Application unsuccessful |
| interviewing | offered | Offer received |
| interviewing | rejected | Unsuccessful after interview |
| interviewing | withdrawn | Simon withdraws during process |

### Status Definitions

| Status | Meaning |
|---|---|
| new | Just captured, not yet reviewed by Simon |
| interested | Simon has flagged for follow-up or application |
| applied | Application submitted |
| interviewing | In active interview process |
| offered | Offer received |
| rejected | Application unsuccessful or role filled |
| withdrawn | Simon chose not to proceed |
| archived | No longer relevant (listing removed, stale, etc.) |

## Field Validation Rules

| Field | Rule |
|---|---|
| track | Must be `product` or `it` |
| score | Integer, 0-100 |
| verdict | Must be `strong`, `possible`, or `weak` |
| status | Must be a valid status from the lifecycle above |
| source | Must be `linkedin`, `seek`, `indeed`, or `other` |
| source_pipeline | Must be `manual` or `automated` |
| type | Must be `permanent`, `contract`, or `fixed-term` |
| arrangement | Must be `hybrid`, `remote`, or `on-site` |
| date_found | ISO 8601 date format (YYYY-MM-DD) |
| applied_date | ISO 8601 date format or empty |

## Score Classification

| Range | Verdict | Action |
|---|---|---|
| 80-100 | strong | Capture and flag for immediate review |
| 60-79 | possible | Capture with notes on what is missing |
| 40-59 | weak | Skip unless Simon asked for broader results |
| Below 40 | skip | Do not capture |

## Duplication Rules

A listing is considered a duplicate if:
- Same URL (exact match)
- Same company + same or very similar role title
- Same recruiter + same salary range + same location (reposted through different channel)

If duplicate found: update the existing row with any new information rather than creating a new row.

## Google Sheet Structure

- **Sheet name:** Job Tracker - Simon Paynter
- **Tab 1 "Tracker":** All 18 columns in the order listed in the Schema section above
- **Tab 2 "Dashboard":** Summary formulas and filter views

## Migration Path

When the central database is built:
1. This schema maps directly to a PostgreSQL table
2. The status lifecycle becomes database-level constraints
3. The validation rules become application-level or database check constraints
4. n8n workflows swap Google Sheets nodes for PostgreSQL nodes — same data, different destination
