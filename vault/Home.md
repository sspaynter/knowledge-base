# SS42 Knowledge Base

Welcome to the vault. This is the single source of truth for all reference documentation across SS42 projects.

## Workspaces

### Inbox
Capture — brain dumps, dated session notes, unprocessed ideas. Convention: `YYYY-MM-DD-topic.md`. Process regularly: move to the right workspace or delete.

*(add entries as needed)*

### Operations
How I work — AI model, infrastructure, tools, engineering practice.

- **AI Operating Model**
  - [[overview|AI Operating Model Overview]]
- **Infrastructure**
  - [[nas-containers|NAS Container Inventory]]
  - [[cross-app-auth-architecture|Cross-App Auth Architecture]]
  - [[cross-app-auth-audit|Cross-App Auth Audit]]
  - [[security-checklist|Security Checklist]]
- **Engineering Practice**
  - [[claude-workflow|Claude Workflow & Agents]]
  - [[lifecycle-pattern|SS42 Lifecycle Pattern]]
  - [[sdd-conventions|Spec-Driven Development]]
  - [[lifecycle-release-design|Lifecycle Release Design]]

### Products
Own apps maintained indefinitely.

- **Knowledge Base**
  - [[kp-overview|Overview]]
  - [[kp-architecture|Architecture]]
  - [[kp-design-decisions|Design Decisions]]
  - [[kp-feature-status|Feature Status]]
  - [[kp-v1.1.0-scope|v1.1.0 Scope]]
- **Applyr**
  - [[applyr-overview|Overview]]
  - [[applyr-architecture|Architecture]]
  - [[applyr-feature-status|Feature Status]]
- **ToDo**
  - [[todo-overview|Overview]]

### Projects
Finite outcomes with defined deliverables. Client work only.

*(no active client engagements)*

### Studio
Self-directed commercial activity — ss42, SimonSaysAutomation, bags.

*(add content as needed)*

### Work
Employment — working for someone else. One folder per company.

*(add employment docs as needed)*

### Personal

- **Job Search**
  - [[architecture-overview|System Architecture]]
  - [[data-contract|Data Contract & Schema]]
  - [[scoring-pipeline|Scoring Pipeline]]
  - [[profile-refinement-log|Profile Refinement Log]]
  - [[rejection-analysis|Rejection Analysis]]
  - [[analysis-yes-maybe-jobs|YES/MAYBE Jobs Analysis]]

### Learning
*(empty — add content as needed)*

### Archive
*(inactive items)*

---

## How This Works

- **This vault is the master copy.** All documentation lives here as markdown files.
- **Original project copies are deprecated.** They have a notice pointing here.
- **The KB web app** reads directly from this vault — no migration needed.
- **Claude Code sessions** should read and write files in this vault, not in project `docs/` folders.
- **Obsidian** is the interim viewer / editor.
