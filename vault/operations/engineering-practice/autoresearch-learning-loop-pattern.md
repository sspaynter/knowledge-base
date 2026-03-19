---
author: both
order: 130
title: AutoResearch Learning Loop Pattern
---


# AutoResearch Learning Loop Pattern

## Origin

[Karpathy's AutoResearch](https://github.com/karpathy/autoresearch) (March 2026) gives a Claude agent a small LLM training setup and lets it experiment autonomously. The agent modifies code, trains for 5 minutes, checks if the result improved, keeps or discards, and repeats. You wake up to a log of experiments and a better model.

The pattern is general. It applies to any system where:

1. There is a measurable output
2. Something can be varied between runs
3. A keep/discard decision can be automated or assisted

This article extracts the reusable pattern and maps it to SS42 projects.

---

## The Pattern

```
Fixed evaluation criteria (prepare.py)
    +
Variable inputs (train.py)
    +
Human strategy guide (program.md)
    =
Experiment loop:
    Modify → Run → Measure → Keep or Discard → Log → Repeat
```

### Five components

| Component | Role | Changes by |
|---|---|---|
| **Evaluation criteria** | Fixed rubric or metric that scores output quality | Human (infrequent — when the definition of "good" changes) |
| **Variable inputs** | The thing being optimised — what changes between runs | Agent or system (every experiment) |
| **Strategy guide** | High-level instructions that shape what the agent tries | Human (periodically — refining the research direction) |
| **Results log** | Structured record of every experiment: input, score, keep/discard | System (automatically, every run) |
| **Keep/discard logic** | Decision rule: did the output improve? | Automated (metric-based) or human-assisted (subjective quality) |

### Key insight: you need a metric

The loop only works if there is a measurable signal. AutoResearch uses `val_bpb` (validation bits per byte) — a single number, lower is better. Without this, the agent cannot know if an experiment worked.

For subjective domains (writing, design), a perfect metric does not exist. But a **proxy metric** — an automated rubric that catches the obvious failures — is still better than no metric. The human remains the ground truth evaluator, but the proxy reduces cognitive load and enables trend analysis over time.

---

## Mapping to SS42 Projects

### Applyr — Cover Letter Generation

First application of this pattern. Full design in `products/applyr/applyr-cover-letter-architecture.md` § Generation Scoring.

| AutoResearch | Applyr equivalent |
|---|---|
| `prepare.py` (fixed evaluation) | Rubric evaluator: voice match, specificity, anti-slop, structure, opening quality |
| `train.py` (agent modifies) | Voice profile (Layer 3) — style principles, phrases, ammunition library |
| `program.md` (human strategy) | Layers 1+2 — craft framework (PSE/SARR) + quality rules (anti-slop, rhythm) |
| `results.tsv` | `generation_scores` jsonb on `cover_letters` table |
| val_bpb | Rubric composite score + rewrite count before acceptance |
| keep/discard | User accepts first-gen (keep) / rewrites (partial discard) / abandons (full discard) |

**Loop cadence:** Not overnight autonomous — runs once per job application. But the same measure-learn-improve structure applies across dozens of applications over weeks.

**What the rubric enables:**
- Harvest step (#145) uses rubric trends to decide what to promote to voice profile
- Weekly consolidation (#146) analyses which stories/style principles correlate with high scores
- Ammunition scoring (#142) feeds back story selection/survival rates

### Applyr — Resume Tailoring (future)

Same pattern applies once voice profile is integrated (#144):

| Component | Resume equivalent |
|---|---|
| Evaluation criteria | Rubric: relevance to JD, specificity of suggestions, ATS compatibility |
| Variable inputs | Ammunition stories selected, differentiators highlighted |
| Results log | Which suggestions user accepted vs rejected |
| Keep/discard | Accept suggestion (keep) / reject (discard) |

### Other SS42 Applications (potential)

The pattern applies wherever we generate content and want to improve over time:

| Domain | Metric proxy | Variable input | Feedback signal |
|---|---|---|---|
| Blog writing | Anti-slop score, readability, voice match | Blog workshop style preferences | Published vs rejected drafts |
| Company research | Relevance to role, actionable insight density | Research prompt structure | Sections user actually reads vs skips |
| n8n job scoring | Interview callback rate (delayed) | Scoring weights and criteria | Jobs user marks "interested" vs "not interested" |

---

## Implementation Considerations

### Proxy metric vs ground truth

The rubric is a proxy. The ground truth for a cover letter is: did it get an interview? That signal is delayed by weeks and confounded by many factors (resume, market, timing). The rubric provides immediate signal that is directionally useful even if imperfect.

**Rule:** Use the proxy for automated decisions (ammunition scoring weights, story prioritisation). Use ground truth (interview callbacks, user satisfaction) for periodic human review of whether the proxy is calibrated.

### Token cost

Each rubric evaluation is a second Claude API call. For cover letters this is acceptable — one evaluation per generation, ~500 input tokens (letter + rubric), ~200 output tokens (scores + reasoning). Cost is negligible relative to the generation call itself.

### Avoiding overfitting

AutoResearch has a "simplicity criterion" — a small improvement that adds ugly complexity is not worth it. The equivalent for us: do not over-optimise the voice profile for one type of role. Weekly consolidation must check that improvements for PM-track letters do not degrade IT-track letters.

### Human in the loop

AutoResearch is fully autonomous — the agent runs 100 experiments overnight. Our loop is human-assisted — the user reviews each generation. This is correct for subjective quality. The rubric automates the objective checks (anti-slop, structure, word count) so the user only needs to evaluate voice and strategic fit.

---

## References

- [Karpathy AutoResearch repo](https://github.com/karpathy/autoresearch) — source implementation
- [Karpathy tweet](https://x.com/karpathy/status/2029701092347630069) — context and motivation
- `products/applyr/applyr-cover-letter-architecture.md` — Applyr-specific implementation design
- `products/applyr/applyr-roadmap.md` — Sprint tasks #142-146, #157
