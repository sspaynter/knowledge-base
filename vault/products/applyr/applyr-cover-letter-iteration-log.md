---
author: both
order: 42
title: Applyr — Cover Letter Iteration Log
created: 2026-03-13
updated: 2026-03-13
parent: applyr-cover-letter-architecture
---

# Applyr — Cover Letter Iteration Log

What we tried, what the model did, what we changed. Each session that modifies cover letter prompts should append an entry. This prevents repeating failed approaches and captures the evolution of the prompt architecture.

---

## Session 71 — 2026-03-13

**Sprint:** applyr-cl-quality
**Tasks:** #137 (3-layer refactor), #138 (voice profile rhythm), #139 (craft layer refinement)
**Branch:** dev

### Starting State

Cover letter prompts were a monolithic `FALLBACK_SYSTEM_PROMPT` mixing craft rules, quality rules, and voice instructions in a single string. No internal exports for testing. Zero test coverage on prompt composition.

### Iteration 1: 3-Layer Refactor (#137)

**Change:** Separated into `CRAFT_LAYER`, `QUALITY_LAYER`, `buildVoiceSection()`, `buildSystemPrompt()`, `buildRewritePrompt()`. Exported via `_internal` for testing. Created 40 unit tests.

**Bug found:** `buildVoiceSection()` output "undefined" when voice profile had no `structure` section. Fixed with conditional spread.

**Result:** Clean separation, testable, no functional change to output.

### Iteration 2: Voice Profile Rhythm (#138)

**Change:** Added 4 style_principles (sentence length variation, uneven rhythm, personal not polished, no robotic transitions). Added 6 phrases_to_avoid (Furthermore/Moreover, "I bring a unique combination", performative enthusiasm). Removed opening ban now covered by Layer 1.

**Result:** Voice profile aligned with craft layer. No conflicts.

### Iteration 3: Craft Layer Structured Sections (#139)

**Change:** Rewrote CRAFT_LAYER from flat bullet list to structured sections (### Opening, ### Body, ### Close, ### Format). Added SARR pattern. Pushed to staging.

**Result:** First staging test. Two issues found:
1. No salutation — prompt explicitly banned it
2. Opening paragraph sounded like lecturing the company

### Iteration 4: Discovery Framing

**Change:** Rewrote opening instructions with "discovery language" phrases: "When I read about...", "I noticed...", "What caught my attention was..."

**Result:** Model rotated through the three prescribed phrases. Output felt templated. "What caught my attention" particularly weak — Simon rejected it as not something you would say in a cover letter.

### Iteration 5: Intent-Based Opening (No Prescribed Phrases)

**Change:** Removed all prescribed phrases. Described what the opening must achieve: "show recognition, not research." Added rule to end on the company's challenge.

**Result:** Model still opened with "TES sits in an interesting position" — a third-person business assessment. The intent description was too abstract; no structural anchor to prevent the default pattern.

**Key learning:** Intent descriptions without structural constraints do not override the model's trained pattern for professional writing about companies (third-person analytical voice from training data).

### Iteration 6: Framework Conflict Discovery

**Change:** Printed the full assembled system prompt. Found the voice profile framework section said "Name the company's actual challenge — show you researched it" — directly contradicting the opening guidance. Also found old "discovery arc" language in the Format line.

**Result:** Fixed both conflicts. Still not enough to change model behaviour.

**Key learning:** Always print and review the full assembled prompt after changes. Layers can contradict each other when updated independently.

### Iteration 7: Positive Structural Constraints + Examples

**Change:** Major rewrite based on prompt engineering research:
- Replaced 5 negative "Never..." rules with positive structural constraints
- Added first-person positional constraint: "first sentence must be first-person, applicant as subject"
- Added 3 example opening paragraphs in `<examples>` tags using real company names (VideoMy, Canva, Xero)
- Added "interesting position/challenge" to quality layer bans
- Reframed "end on the tension" to "name the hard challenge with respect"

**Result:**
- TES opening improved — first-person perspective, but still ended with "where most edtech organisations struggle" (diagnosing their weakness)
- Xero opening copied the example almost verbatim (we used Xero as an example company)

**Key learnings:**
1. Real company names in examples get copied verbatim — must anonymise
2. "End on the tension" gets interpreted as "tell them where they struggle" — needs respectful framing
3. First-person constraint worked — no more "TES sits in..."

### Iteration 8: Anonymised Examples + Respectful Framing

**Change:** Replaced real company names with anonymised descriptions ("[a video communications startup]", "[a design tools company]"). Added explicit "Do NOT copy these" instruction. Reframed tension ending to "framed as something worth solving, with respect for the people already working on it. You are joining this challenge, not diagnosing it from outside."

**Result:** Xero opening improved — first-person, connected to real Datacom experience. TES opening still ended with "where most edtech organisations struggle" (diagnosing). Examples being copied in structure even when anonymised.

### Iteration 9: Soften Examples + Fabrication Guard

**Change:**
- Removed "immediately" and "I recognised/identified" from all examples — replaced with humble connection language ("one I have spent time in", "I went through something similar")
- Added fabrication guard: "draw ONLY from the ammunition library, resume, or job history provided. Never invent domain expertise the applicant does not have"
- Rewrote third example to use NEC experience (real) showing transferable skills rather than domain expertise

**Result:**
- Xero: "the challenge it creates is one I have spent real time in — at JB HiFi Solutions I built a Device as a Service offering from scratch" — first-person, real experience, humble tone. Good.
- TES: "I recognised something I have spent significant time working through — the gap between what a product can do and what the people using it actually need" — draws on real product experience, no fabricated school admin history. Good.
- Both still end on general observations rather than a specific personal insight about the tension. Acceptable for v1 — the feedback/rewrite loop can refine this.

**Key learnings:**
1. "Immediately" is the word that makes recognition language sound arrogant
2. Without a fabrication guard, the model invents domain expertise to satisfy "show you have lived something similar"
3. Examples teach tone as much as structure — even anonymised, the emotional register of examples carries through

### Session 71 Conclusion

After 9 iterations, the opening paragraph is structurally sound: first-person perspective, real experience, humble connection, no fabrication, no business assessment. The remaining quality gap — ending on a specific personal insight rather than a general observation — is better suited to the feedback/rewrite loop than further prompt engineering. The prompt gets to ~80%; the rewrite cycle handles the last 20%.

### Key Learnings (Session 71)

1. **Prescriptive phrases become ceilings.** Claude 4.x rotates through listed phrases and nothing else.
2. **Negative bans prime the banned pattern.** Pink Elephant Problem — the model must represent what to avoid, increasing its likelihood.
3. **Real company names in examples get copied verbatim.** Always anonymise.
4. **Intent without structure does not work.** "Show recognition" is too abstract. "First sentence must be first-person" is structural.
5. **Always review the full assembled prompt.** Layer conflicts are invisible when editing one file at a time.
6. **No company research = generic output.** TES had zero research in the database; output was inevitably generic regardless of prompt quality.
7. **"Tension" gets interpreted as diagnosis.** The model defaults to telling the company where they struggle. Needs explicit "with respect" framing.
8. **"Immediately" makes recognition sound arrogant.** "I recognised the problem immediately" reads as "I know best." Connection language ("one I have spent time in") is humble and effective.
9. **Without a fabrication guard, the model invents domain expertise.** "Show you have lived something similar" caused the model to invent school admin software experience for TES.
10. **The last 20% is the rewrite loop's job.** Prompt engineering gets structural compliance; the specific personal insight that makes an opening great comes from user feedback.

### Commits

| Hash | Description |
|---|---|
| `9813181` | refactor: decompose CL prompts into 3-layer architecture (#137) |
| `0632067` | test: add unit tests for 3-layer CL prompt architecture (#137) |
| `f775e46` | feat: add rhythm and naturalness principles to voice profile (#138) |
| `5beccbc` | feat: refine craft layer with structured section guidance (#139) |
| `791dc1a` | feat: discovery framing for CL opening + salutation (#139) |
| `f8f2540` | fix: move salutation instruction into CRAFT_LAYER for stronger compliance (#139) |
| `b5ba5f2` | fix: opening paragraph must land on insight, not self-reference (#139) |
| `fc90783` | feat: intent-based opening guidance, remove prescriptive phrases (#139) |
| `c5af557` | fix: resolve conflicting prompt instructions in framework and format (#139) |
| `227c82c` | feat: positive structural constraints + example openings for CL (#139) |
| `775e5d4` | fix: anonymise examples and reframe tension as respectful challenge (#139) |
| `d816711` | fix: soften example tone and add fabrication guard (#139) |
