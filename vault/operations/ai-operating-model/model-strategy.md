---
title: Model Strategy
status: published
author: both
parent: overview
created: 2026-03-13
updated: 2026-03-13
---

# Model Strategy

This page documents the model strategy for the SS42 AI Operating Model — which models are used, why, and how the architecture supports switching when the landscape shifts.

## The Three-Layer Model

The AI industry has three distinct layers, each owned by different players:

| Layer | What it is | Who owns it |
|---|---|---|
| Model | The LLM itself | Anthropic (Claude), OpenAI (GPT), Meta (Llama), Google (Gemini), open-weight community |
| Agent orchestration | Skills, workflows, tool use | SS42 (Claude Code skills/agents), LangChain, CrewAI, NVIDIA NemoClaw |
| Compute | Where it runs | Cloud providers (all use NVIDIA GPUs), local hardware (NVIDIA GPUs, Apple Silicon) |

SS42 operates at the **agent orchestration layer**. The model layer and compute layer are inputs. This is a deliberate position — it means the system is not locked to any single model provider, even though it currently depends on Claude for quality reasons.

## Cloud API vs Local Deployment

An honest comparison:

| Dimension | Local LLM (Mac Mini/Studio) | Claude via API |
|---|---|---|
| Cost per token | Zero after hardware | Pay per use |
| Instruction following | Adequate for simple tasks, unreliable for complex multi-step | Frontier-class |
| Tool use | Basic, requires custom wiring | Native, battle-tested |
| Context window | 8K–128K depending on model | 200K |
| Code generation quality | Good for boilerplate, weak on architecture | Strong across the board |
| Privacy | Nothing leaves the machine | Data goes to Anthropic |
| SS42 skills/agents | Would need complete rewrite into a different framework | Work as-is |

The gap that matters: SS42 agents do complex multi-step work — TDD across multiple files, reviewer loops, PM specs with traceability. Local models in the 7B–70B range cannot do this reliably. They drift, skip steps, and hallucinate tool calls. The instruction-following ceiling is the real constraint, not raw intelligence on benchmarks.

## Model Routing

The answer is not one or the other. It is model routing — use the right model for each task:

| Task type | Model | Why |
|---|---|---|
| Code generation, architecture, complex reasoning | Claude Sonnet/Opus (via `claude -p`, Max plan) | Quality premium justified |
| Writing, cover letters, strategic output | Claude Sonnet (via `claude -p`) | Voice fidelity, instruction following |
| Read-only analysis, research | Claude Haiku (via `claude -p`) | Fast, cheap, sufficient quality |
| Classification, triage (n8n pipeline) | Claude Haiku (via API) | High volume, low complexity |
| Data extraction, formatting, simple transforms | Could be local model (future) | High volume, privacy-sensitive, low reasoning |
| File ops, calendar, simple lookups | Rule-based — no model needed | Deterministic |

The 80/20 pattern emerging across industry: 80% of requests go to cheap or local models, 20% to frontier proprietary models. SS42 is not there yet — currently 100% Claude — but the architecture supports it when local models catch up. The agent orchestration layer does not care which model answers, as long as the model can follow the spec.

## NVIDIA NemoClaw and What It Signals

NVIDIA announced NemoClaw in March 2026 — an open-source enterprise AI agent platform. Key facts:

- **Hardware-agnostic** — runs regardless of chip vendor
- **Open-source** — enterprises can customise and audit
- **Enterprise-focused** — built-in security and privacy tools
- **Partnerships** with Salesforce, Cisco, Google, Adobe, CrowdStrike

Jensen Huang's key number: agents consume 1,000x more tokens than chatbots.

What this means: NVIDIA is not competing with Anthropic or OpenAI. They are building the agent orchestration layer for enterprises. They sell the compute regardless — cloud data centres, on-premise servers, and local workstations all buy NVIDIA GPUs. It is a "sell shovels" strategy. The more tokens agents consume, the more GPUs the world needs.

**For SS42:** NemoClaw competes with LangChain and CrewAI, not with Claude Code. SS42's agent orchestration is built on Claude Code's native capabilities — skills, agents, hooks, subagents. No framework switch is needed unless the value proposition changes substantially. The key differentiator is that Claude Code agents are embedded in the development workflow itself, not bolted on as a separate orchestration layer.

## Open-Weight Models — Current State (Q1 2026)

The gap between open-weight and proprietary has narrowed significantly:

- **DeepSeek V3.2** — frontier reasoning quality with efficiency
- **Qwen3.5-397B (MoE)** — suited for agentic and multimodal workloads
- **Qwen3-Coder-Next** — SWE-Bench Pro performance roughly on par with Claude Sonnet 4.5

The benchmarks are converging. The gap that remains is in sustained multi-turn instruction following with tool use — exactly the capability SS42 agents depend on.

**For SS42:** Open-weight models become relevant when they can reliably follow complex behavioural specs (skills) across many turns with tool use. That is not today, but it is approaching. Monitor quarterly. The first candidate use case will likely be high-volume data extraction or classification in n8n pipelines, where the task is simple enough that instruction-following gaps do not matter.

## The Client Delivery Angle

If SS42 packages agent-based business transformation for clients, the model strategy splits:

- **Build on Claude** — frontier quality for agent development and iteration
- **Deploy on client hardware where needed** — "your data never leaves your building"
- **Use open-weight models for client deployments** where data sovereignty requires it

This is a real differentiator for regulated industries — finance, healthcare, defence. An agent built and validated on Claude can be re-targeted to an open-weight model for deployment, because the agent orchestration layer is separate from the model layer.

The work to enable this:
1. Abstract model calls behind a routing layer (not yet built)
2. Validate agent behaviour on target open-weight models (per-client)
3. Document quality trade-offs transparently (some tasks will degrade)

Not needed today. But the architecture supports it, and that is the point.

## Decision: Current Model Strategy

| Decision | Choice | Rationale |
|---|---|---|
| Primary model | Claude (Opus for orchestration, Sonnet for build/review, Haiku for research/triage) | Best instruction following and tool use in the market |
| Model access | Max plan via `claude -p` (interactive), API for n8n automation | No API key overhead for development work |
| Local models | Not yet | Monitor open-weight progress quarterly. First candidate: high-volume data extraction in n8n pipelines |
| Agent framework | Claude Code native | No third-party agent framework. Revisit if NemoClaw or equivalent offers compelling value |
| Cost management | Model routing by task type | Haiku for volume, Sonnet/Opus for quality. Track token usage at session level (future: observability page) |

The strategy is simple: use the best model available for each task, keep the orchestration layer framework-independent, and do not lock in where the landscape is still moving fast.

---

## Related

- [AI Operating Model — Overview](/page/operations/ai-operating-model/overview)
- [Current State](/page/operations/ai-operating-model/current-state)
- [Future State](/page/operations/ai-operating-model/future-state)
- [Architecture](/page/operations/ai-operating-model/architecture)
- [Roadmap](/page/operations/ai-operating-model/roadmap)

## Sources

- NVIDIA NemoClaw announcement (CNBC, March 2026)
- Motley Fool analysis of NVIDIA agent strategy (March 2026)
- Techloy NemoClaw overview (March 2026)
- Sebastian Raschka on open-weight LLMs (2026)
- Deloitte on AI token economics (2026)
