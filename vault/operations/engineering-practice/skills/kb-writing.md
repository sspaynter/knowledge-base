---
author: claude
order: 180
title: KB Writing Skill
---


# KB Writing Skill

**Type:** Skill reference
**Skill file:** `~/.claude/skills/kb-writing/SKILL.md`
**Invocable:** No (background skill)
**Loaded by:** Any session writing vault content
**Tier:** S2 (Foundation — depends on #68 standard-product-docs)
**MASTER-TODO:** #71

## Purpose

Provides article templates, quality rules, frontmatter validation, and doc audit capability for KB vault content. Supplements the global CLAUDE.md vault writing instructions (file mechanics) with content-level structure and quality enforcement.

## When it activates

Loaded automatically when any session writes, edits, or reviews files in `knowledge-base/vault/`. Not user-invocable — operates as a background quality layer.

## What it produces

- Correctly structured vault articles matching doc-type templates
- Valid frontmatter with required fields per doc type
- Inter-page links in ADR-010 format (`/page/{vault-path}`)
- Quality audit reports when requested

## Key capabilities

### Article templates

Seven doc-type templates with required sections:
- Overview (product/project)
- Feature status
- Convention / engineering practice
- How-to / procedure
- Decision record (ADR)
- Release notes
- Skill reference

### Frontmatter validation

Required fields vary by doc type. Product docs require: title, status, author, created, updated. Engineering practice docs require: title, status, updated.

### Inter-page links

Enforces ADR-010 link format: `[Display Text](/page/{workspace}/{section}/{slug})`. No copied content — single source of truth rule from standard-product-docs (#68).

### Doc audit mode

On request, scans a vault directory and produces a structured report: template compliance, required sections, frontmatter validity, link format, freshness. Outputs pass/fail counts and specific issues.

## Does not own

- File naming, sync commands, frontmatter YAML format — owned by global CLAUDE.md
- Product documentation hierarchy, gates, completeness checklist — owned by pm-product-documentation skill
- Voice, tone, writing style — owned by simon-context skill

## Related skills

- [Standard Product Docs](/page/operations/engineering-practice/standard-product-docs) — the template this skill enforces
- [Skills Overview](/page/operations/engineering-practice/skills/skills-overview) — gap analysis and sequencing
- [KB Vault Management](/page/operations/engineering-practice/kb-vault-management) — file mechanics and taxonomy
