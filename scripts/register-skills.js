#!/usr/bin/env node

// register-skills.js — Register Claude skills, agents, and superpowers as KB assets
// and map relationships between them.
//
// Usage:
//   KB_TOKEN=<bearer-token> node scripts/register-skills.js [--dry-run]
//
// Requires: KB production API at http://192.168.86.18:32781
// Idempotent: skips assets that already exist (matched by title + type).

'use strict';

const KB_BASE = process.env.KB_URL || 'http://192.168.86.18:32781';
const KB_TOKEN = process.env.KB_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

if (!KB_TOKEN) {
  console.error('Error: KB_TOKEN environment variable is required');
  process.exit(1);
}

// ── Asset Definitions ────────────────────────────────────────

const ASSETS = [
  // Global Background Skills
  { title: 'simon-context', description: 'Working context, cognitive style, communication preferences, response format guidelines.', metadata: { category: 'skill', scope: 'global', invocable: false, background: true, path: '~/.claude/skills/simon-context/SKILL.md' } },
  { title: 'code-quality', description: 'Coding standards applied silently: no console.log, no hardcoded credentials, validated input, safe error messages.', metadata: { category: 'skill', scope: 'global', invocable: false, background: true, path: '~/.claude/skills/code-quality/SKILL.md' } },
  { title: 'infra-context', description: 'Deployment infrastructure reference: Docker, PostgreSQL, n8n, Cloudflare Tunnel, GitHub Actions, GHCR.', metadata: { category: 'skill', scope: 'global', invocable: false, background: true, path: '~/.claude/skills/infra-context/SKILL.md' } },
  { title: 'nas-ops', description: 'QNAP NAS reference data: network config, container IPs, Cloudflare subdomains, SSH alias.', metadata: { category: 'skill', scope: 'global', invocable: false, background: true, path: '~/.claude/skills/nas-ops/SKILL.md' } },

  // Global Implementation Skills
  { title: 'nas-deploy', description: 'NAS deployment playbooks, container creation checklist, lessons learned, operational procedures.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/nas-deploy/SKILL.md' } },
  { title: 'app-scaffold', description: 'Scaffold production-ready self-hosted web apps with Express, SQLite, vanilla JS, Docker, CI/CD.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/app-scaffold/SKILL.md' } },
  { title: 'product-design', description: 'Rigid gate-enforced product design: user problem, user flow, IA, design system, prototype, implementation plan.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/product-design/SKILL.md' } },

  // Global Writing & Documentation Skills
  { title: 'blog-workshop', description: 'Conversational blog post creation: discovery interview, iterative drafting, visual review playground.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/blog-workshop/SKILL.md' } },
  { title: 'end-of-session', description: 'Structured session close-out: plan file, MEMORY.md, session log, vault articles, feature status, skills check, next-session prompt.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/end-of-session/SKILL.md' } },
  { title: 'lifecycle-release', description: 'Full release pipeline: pre-flight checks, commit analysis, single confirmation gate, automated execution, post-release verification.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/lifecycle-release/SKILL.md' } },
  { title: 'update-skill', description: 'Review session and propose updates to a named skill file. Always requires approval before writing.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/update-skill/SKILL.md' } },
  { title: 'update-nas', description: 'Review session and propose updates to both NAS skills (nas-ops + nas-deploy) in one pass.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/update-nas/SKILL.md' } },
  { title: 'update-simon-context', description: 'Review session to identify updates to Simon context skill: corrections, preferences, patterns, constraints.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/update-simon-context/SKILL.md' } },

  // Global PM Skills
  { title: 'pm-feature-spec', description: 'PRD writing: problem statements, user stories, requirements (MoSCoW), acceptance criteria (Given/When/Then), success metrics.', metadata: { category: 'skill', scope: 'global', invocable: false, background: false, path: '~/.claude/skills/pm-feature-spec/SKILL.md' } },
  { title: 'pm-product-documentation', description: 'Full four-layer PM documentation framework: opportunity backlog, user story map, feature specs, user journeys.', metadata: { category: 'skill', scope: 'global', invocable: true, background: false, path: '~/.claude/skills/pm-product-documentation/SKILL.md' } },
  { title: 'pm-roadmap-management', description: 'Roadmap planning: Now/Next/Later, quarterly themes, RICE/MoSCoW/ICE prioritisation, dependency mapping.', metadata: { category: 'skill', scope: 'global', invocable: false, background: false, path: '~/.claude/skills/pm-roadmap-management/SKILL.md' } },
  { title: 'pm-metrics-tracking', description: 'Product metrics: North Star, L1/L2 hierarchy, OKR goal setting, review cadences, dashboard design, alerting.', metadata: { category: 'skill', scope: 'global', invocable: false, background: false, path: '~/.claude/skills/pm-metrics-tracking/SKILL.md' } },
  { title: 'pm-stakeholder-comms', description: 'Stakeholder communication templates: exec, engineering, cross-functional, customer. Status updates, risk comms, decision docs.', metadata: { category: 'skill', scope: 'global', invocable: false, background: false, path: '~/.claude/skills/pm-stakeholder-comms/SKILL.md' } },
  { title: 'pm-user-research-synthesis', description: 'Research synthesis: thematic analysis, affinity mapping, persona development, opportunity sizing.', metadata: { category: 'skill', scope: 'global', invocable: false, background: false, path: '~/.claude/skills/pm-user-research-synthesis/SKILL.md' } },
  { title: 'pm-competitive-analysis', description: 'Competitive analysis: feature matrices, positioning analysis, win/loss methodology, market trends.', metadata: { category: 'skill', scope: 'global', invocable: false, background: false, path: '~/.claude/skills/pm-competitive-analysis/SKILL.md' } },

  // Global Agents
  { title: 'researcher', description: 'Explores codebase and problem space, returns structured brief. Read-only inspection via Bash.', metadata: { category: 'agent', scope: 'global', model: 'haiku', path: '~/.claude/agents/researcher.md' } },
  { title: 'builder', description: 'Implements code from research brief or spec. Follows TDD. Does not refactor surrounding code.', metadata: { category: 'agent', scope: 'global', model: 'sonnet', path: '~/.claude/agents/builder.md' } },
  { title: 'reviewer', description: 'Reviews and tests built code. Runs in ralph loop until PASS. NAS and Docker-specific checks.', metadata: { category: 'agent', scope: 'global', model: 'sonnet', path: '~/.claude/agents/reviewer.md' } },
  { title: 'pm-breakdown', description: 'Breaks product ideas into outcome, tasks, acceptance criteria. SDD format with spec references and EARS notation.', metadata: { category: 'agent', scope: 'global', model: 'opus', path: '~/.claude/agents/pm-breakdown.md' } },
  { title: 'product-manager', description: 'Senior PM agent: specs, roadmaps, competitive briefs, stakeholder comms, research synthesis, metrics.', metadata: { category: 'agent', scope: 'global', model: 'sonnet', path: '~/.claude/agents/product-manager.md' } },

  // Superpowers
  { title: 'brainstorming', description: 'Explores user intent, requirements, design before implementation through natural dialogue.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/brainstorming/' } },
  { title: 'test-driven-development', description: 'Write test first, watch it fail, write minimal code to pass. Violating the letter violates the spirit.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/test-driven-development/' } },
  { title: 'writing-plans', description: 'Comprehensive implementation plans for multi-step tasks. Assume zero codebase context. DRY. YAGNI. TDD.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/writing-plans/' } },
  { title: 'verification-before-completion', description: 'Evidence before claims. Running verification commands and confirming output before success claims.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/verification-before-completion/' } },
  { title: 'systematic-debugging', description: 'Always find root cause before attempting fixes. Symptom fixes mask underlying issues.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/systematic-debugging/' } },
  { title: 'dispatching-parallel-agents', description: 'Dispatch one agent per independent problem domain. Investigate unrelated failures concurrently.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/dispatching-parallel-agents/' } },
  { title: 'executing-plans', description: 'Load plan, review critically, execute tasks in batches with checkpoints for architect review.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/executing-plans/' } },
  { title: 'finishing-a-development-branch', description: 'Verify tests, present options, execute choice, clean up. Structured completion of development work.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/finishing-a-development-branch/' } },
  { title: 'using-git-worktrees', description: 'Create isolated git worktrees sharing same repository. Systematic directory selection and safety verification.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/using-git-worktrees/' } },
  { title: 'subagent-driven-development', description: 'Dispatch fresh subagent per task with two-stage review: spec compliance first, then code quality.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/subagent-driven-development/' } },
  { title: 'receiving-code-review', description: 'Receive and apply code review feedback. Structured response to review comments.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/receiving-code-review/' } },
  { title: 'requesting-code-review', description: 'Request code review from peers or agents. Structured review request format.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/requesting-code-review/' } },
  { title: 'using-superpowers', description: 'Guidance on when and how to use superpowers effectively. Meta-skill for skill navigation.', metadata: { category: 'superpower', scope: 'global', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/skills/using-superpowers/' } },
  { title: 'code-reviewer', description: 'Reviews completed project steps against plan and coding standards. Architecture, design patterns, best practices.', metadata: { category: 'agent', scope: 'global', source: 'superpowers', path: '~/.claude/plugins/cache/claude-plugins-official/superpowers/4.3.1/agents/code-reviewer/' } },

  // Job-App Project Skills
  { title: 'job-search', description: 'Search orchestrator. Coordinates browsing, evaluation, capture across LinkedIn and Seek.', metadata: { category: 'skill', scope: 'project:job-app', invocable: true, background: false, path: '~/Documents/Claude/job-app/.claude/skills/job-search/SKILL.md' } },
  { title: 'job-browse', description: 'Browse LinkedIn and Seek using Chrome automation. Input: track, titles, location, salary.', metadata: { category: 'skill', scope: 'project:job-app', invocable: true, background: false, path: '~/Documents/Claude/job-app/.claude/skills/job-browse/SKILL.md' } },
  { title: 'job-evaluate', description: 'Scoring rubric and classification rules. Identifies track, red flags, scoring dimensions.', metadata: { category: 'skill', scope: 'project:job-app', invocable: false, background: true, path: '~/Documents/Claude/job-app/.claude/skills/job-evaluate/SKILL.md' } },
  { title: 'job-capture', description: 'Save evaluated listings to tracker via n8n webhook (primary) or CSV fallback.', metadata: { category: 'skill', scope: 'project:job-app', invocable: true, background: false, path: '~/Documents/Claude/job-app/.claude/skills/job-capture/SKILL.md' } },
  { title: 'job-apply', description: 'Draft tailored application materials (cover letters, resume suggestions) for a specific role.', metadata: { category: 'skill', scope: 'project:job-app', invocable: true, background: false, path: '~/Documents/Claude/job-app/.claude/skills/job-apply/SKILL.md' } },
  { title: 'job-followup', description: 'Draft follow-up emails: post-interview thank you, stale check-in, rejection response, offer acknowledgement.', metadata: { category: 'skill', scope: 'project:job-app', invocable: true, background: false, path: '~/Documents/Claude/job-app/.claude/skills/job-followup/SKILL.md' } },
  { title: 'job-profile', description: 'Job search profile: two tracks (Product Manager, Head of IT), resume references, preferences, evaluation criteria.', metadata: { category: 'skill', scope: 'project:job-app', invocable: false, background: true, path: '~/Documents/Claude/job-app/.claude/skills/job-profile/SKILL.md' } },
  { title: 'cover-letter', description: 'Cover letter framework in Simon voice. Problem-Solution-Evidence structure, evidence-based best practices.', metadata: { category: 'skill', scope: 'project:job-app', invocable: false, background: false, path: '~/Documents/Claude/job-app/.claude/skills/cover-letter/SKILL.md' } },
  { title: 'gen-test', description: 'Test generation skill for project test scaffolding.', metadata: { category: 'skill', scope: 'project:job-app', invocable: false, background: false, path: '~/Documents/Claude/job-app/.claude/skills/gen-test/SKILL.md' } },

  // Job-App Project Agents
  { title: 'job-researcher', description: 'Company research agent. Deep dive on company context, culture, tech stack, recent news, interview insights.', metadata: { category: 'agent', scope: 'project:job-app', model: 'sonnet', path: '~/Documents/Claude/job-app/.claude/agents/job-researcher.md' } },
  { title: 'interview-prep', description: 'Interview preparation agent. Likely questions, STAR frameworks, company talking points, questions to ask.', metadata: { category: 'agent', scope: 'project:job-app', model: 'sonnet', path: '~/Documents/Claude/job-app/.claude/agents/interview-prep.md' } },
];

// ── Relationship Definitions ─────────────────────────────────
// Defined by title references, resolved to IDs at runtime.

const RELATIONSHIPS = [
  // Agent → Skill (loads)
  { from: 'researcher', type: 'loads', to: 'nas-ops' },
  { from: 'builder', type: 'loads', to: 'code-quality' },
  { from: 'builder', type: 'loads', to: 'infra-context' },
  { from: 'builder', type: 'loads', to: 'nas-ops' },
  { from: 'builder', type: 'loads', to: 'nas-deploy' },
  { from: 'reviewer', type: 'loads', to: 'code-quality' },
  { from: 'reviewer', type: 'loads', to: 'infra-context' },
  { from: 'product-manager', type: 'loads', to: 'pm-feature-spec' },
  { from: 'product-manager', type: 'loads', to: 'pm-product-documentation' },
  { from: 'product-manager', type: 'loads', to: 'pm-roadmap-management' },
  { from: 'product-manager', type: 'loads', to: 'pm-metrics-tracking' },
  { from: 'product-manager', type: 'loads', to: 'pm-stakeholder-comms' },
  { from: 'product-manager', type: 'loads', to: 'pm-user-research-synthesis' },
  { from: 'product-manager', type: 'loads', to: 'pm-competitive-analysis' },

  // Agent → Superpower (uses)
  { from: 'builder', type: 'uses', to: 'test-driven-development' },
  { from: 'reviewer', type: 'uses', to: 'verification-before-completion' },

  // Skill → Skill (uses)
  { from: 'update-nas', type: 'uses', to: 'nas-ops' },
  { from: 'update-nas', type: 'uses', to: 'nas-deploy' },
  { from: 'update-simon-context', type: 'uses', to: 'simon-context' },

  // Skill → Superpower (uses)
  { from: 'product-design', type: 'uses', to: 'brainstorming' },
  { from: 'app-scaffold', type: 'uses', to: 'writing-plans' },
  { from: 'lifecycle-release', type: 'uses', to: 'verification-before-completion' },

  // Superpower pipeline
  { from: 'brainstorming', type: 'generates', to: 'writing-plans', notes: 'Design output feeds implementation planning' },
  { from: 'writing-plans', type: 'generates', to: 'executing-plans', notes: 'Plans feed plan execution' },
  { from: 'subagent-driven-development', type: 'uses', to: 'dispatching-parallel-agents' },
  { from: 'requesting-code-review', type: 'references', to: 'receiving-code-review' },
  { from: 'receiving-code-review', type: 'references', to: 'requesting-code-review' },

  // Job-App skill pipeline
  { from: 'job-search', type: 'uses', to: 'job-browse' },
  { from: 'job-search', type: 'uses', to: 'job-evaluate' },
  { from: 'job-search', type: 'uses', to: 'job-capture' },
  { from: 'job-apply', type: 'uses', to: 'cover-letter' },
  { from: 'job-apply', type: 'uses', to: 'job-profile' },
  { from: 'job-followup', type: 'uses', to: 'job-profile' },
  { from: 'job-browse', type: 'references', to: 'job-evaluate', notes: 'Browse uses evaluate rubric as background reference' },
];

// ── API Helpers ───────────────────────────────────────────────

const headers = {
  'Authorization': `Bearer ${KB_TOKEN}`,
  'Content-Type': 'application/json',
};

async function apiGet(path) {
  const res = await fetch(`${KB_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function apiPost(path, body) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] POST ${path}`, JSON.stringify(body).slice(0, 100));
    return { id: -1, ...body };
  }
  const res = await fetch(`${KB_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (res.status === 409) {
    console.log(`  [SKIP] Duplicate: ${body.title || 'relationship'}`);
    return null;
  }
  if (!res.ok) throw new Error(`POST ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  console.log(`\nKB Skill Asset Registration`);
  console.log(`Target: ${KB_BASE}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // 1. Fetch existing assets to avoid duplicates
  console.log('--- Fetching existing assets ---');
  const existing = await apiGet('/api/assets');
  const existingByTitle = new Map();
  for (const a of existing) {
    // Match by title (lowercase) + type=skill
    if (a.type === 'skill') {
      existingByTitle.set(a.title.toLowerCase(), a);
    }
  }
  console.log(`Found ${existing.length} existing assets (${existingByTitle.size} skills)\n`);

  // 2. Register assets
  console.log('--- Registering assets ---');
  const titleToId = new Map();
  let created = 0;
  let skipped = 0;

  for (const asset of ASSETS) {
    // Check if exists (match by exact title, case-insensitive)
    const existingMatch = existingByTitle.get(asset.title.toLowerCase());
    if (existingMatch) {
      console.log(`  [EXISTS] ${asset.title} (id: ${existingMatch.id})`);
      titleToId.set(asset.title, existingMatch.id);
      skipped++;
      continue;
    }

    const result = await apiPost('/api/assets', {
      type: 'skill',
      title: asset.title,
      description: asset.description,
      metadata: asset.metadata,
      created_by: 'claude',
    });

    if (result) {
      console.log(`  [CREATED] ${asset.title} (id: ${result.id})`);
      titleToId.set(asset.title, result.id);
      created++;
    }
  }

  console.log(`\nAssets: ${created} created, ${skipped} already existed\n`);

  // 3. Create relationships
  console.log('--- Mapping relationships ---');
  let relCreated = 0;
  let relSkipped = 0;
  let relErrors = 0;

  for (const rel of RELATIONSHIPS) {
    const fromId = titleToId.get(rel.from);
    const toId = titleToId.get(rel.to);

    if (!fromId || !toId) {
      console.log(`  [ERROR] Cannot resolve: ${rel.from} --[${rel.type}]--> ${rel.to} (from=${fromId}, to=${toId})`);
      relErrors++;
      continue;
    }

    const body = {
      from_asset_id: fromId,
      to_asset_id: toId,
      relationship_type: rel.type,
    };
    if (rel.notes) body.notes = rel.notes;

    const result = await apiPost('/api/relationships', body);
    if (result) {
      console.log(`  [CREATED] ${rel.from} --[${rel.type}]--> ${rel.to}`);
      relCreated++;
    } else {
      relSkipped++;
    }
  }

  console.log(`\nRelationships: ${relCreated} created, ${relSkipped} duplicates, ${relErrors} errors\n`);

  // 4. Summary
  console.log('=== Summary ===');
  console.log(`Assets:        ${created} created, ${skipped} existed (${titleToId.size} total)`);
  console.log(`Relationships: ${relCreated} created, ${relSkipped} duplicates, ${relErrors} errors`);
  console.log(`\nVerify at: ${KB_BASE} → Map tab`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
