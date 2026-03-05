# KB Session — Skill Asset Registration and Relationship Mapping

Master Todo #32. The KB Map view is empty — no assets or relationships populated yet. This session fills it.

## Task

1. **Catalogue** all Claude skills, agents, and superpowers across `~/.claude/skills/`, `~/.claude/agents/`, `~/.claude/superpowers/`, and each project's `.claude/skills/` directory
2. **Register** each as a KB asset (type: `skill`) via the KB REST API
3. **Map relationships** between them (uses, generates, supersedes, references, loads) via the relationships API
4. **Link** assets to their vault documentation pages where they exist
5. **Verify** the Map view shows the full graph

Use LAN endpoint `http://192.168.86.18:32781` for API calls. Bearer token from `knowledge_base.api_tokens` table or admin UI.

## Done when

- [ ] All skills/agents/superpowers registered as KB assets
- [ ] Relationships mapped between them
- [ ] Map view shows the tooling ecosystem graph
- [ ] Clean commit on `dev` branch
