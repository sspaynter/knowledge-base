---
title: SSA Website — Decisions
status: published
order: 20
author: both
created: 2026-03-16
updated: 2026-03-17
---

# SSA Website — Decisions

## D1 — Single-page site, not multi-page

**Decision:** Ship as a single scrolling page with anchor sections, not separate pages.

**Why:** Speed to live. Simon needs something up quickly. The content fits on one page. Can expand to multi-page later if needed (blog, case studies).

## D2 — Monochrome + orange accent

**Decision:** Black/white base with #ED4C05 orange as the sole accent colour.

**Why:** Clean, professional, distinctive. Orange is uncommon in consulting sites (most use blue/green). Stands out without being loud.

## D3 — Archivo font

**Decision:** Archivo from Google Fonts for all text.

**Why:** Strong, geometric sans-serif that works at all weights. Supports the interlocking logo treatment well. Free, fast to load.

## D4 — Interlocking SSA logo (SS -12px / SA -20px, no shadow)

**Decision:** Letters overlap with asymmetric spacing. A is always on top (z-index:3). No drop shadow.

**Explored alternatives:** Equal overlap (-10px/-10px), shadow variants, different weight scales. The asymmetric version with tighter SA overlap looked most intentional and distinctive.

**Why:** The overlap creates a mark, not just text. The asymmetry gives it character. Shadow added visual noise without benefit.

## D5 — Apple-inspired design cues

**Decision:** Frosted glass nav, true black background, pill-shaped buttons, generous whitespace, scroll fade-in animations via IntersectionObserver.

**Why:** Apple's design language communicates premium and competence. SSA is a professional services site — it should feel considered and confident, not templated.

## D6 — Interactive three-pillar widget for "What We Do"

**Decision:** Click-to-expand pillar cards with detail panels, chips/tags, and data flow visualisation (pillar 3). Only one panel open at a time.

**Why:** The services are connected (Process → Build → Data) and each has depth. A static list does not communicate the flow or the detail. The interactive widget lets visitors explore at their own pace.

## D7 — Background section reversed (Now at top)

**Decision:** Show career timeline with "Now" at the top and "Design" (earliest) at the bottom.

**Why:** Visitors care about what Simon does now, not where he started. Leading with the current state and working backwards is more compelling than chronological order.

## D8 — Animated hero with cartoon Simon character

**Decision:** Animated word-by-word headline ("Redesign. Build. Empower.") on the left, cartoon Simon character sliding in from the right. Three subtitle lines fade in after the headline. Same image in both dark and light modes — no CSS inversion.

**Explored alternatives:** Isometric 3D SVG slabs (too busy), concentric ring diagram (not right), whiteboard with handwritten text overlay (dark mode contrast issues, complexity not justified). All rejected.

**Why:** The text hero with character is clean, distinctive, and animated without being distracting. The cartoon adds personality. Using the same image in both modes avoids visual artifacts from CSS inversion.

## D9 — Hugo + Docker/Nginx + Cloudflare tunnel

**Decision:** Same architecture as simonsays42.com.

**Why:** Proven pattern. Simon already runs it. No new infrastructure to learn. Fast, secure, self-hosted.

## D10 — Self-contained three-pillar widget

**Decision:** The three-pillar widget uses its own dark-card colour scheme (#111 bg) and tp-* prefixed CSS classes, independent of the site theme system.

**Why:** The widget was prototyped separately in Claude Chat. Integrating it into the site theme variables would have required rewriting all the colours and would lose the distinct visual treatment. Self-contained styling with class prefixing avoids CSS conflicts and preserves the widget's design.

## D11 — Sun/moon theme toggle

**Decision:** Single icon button (sun in light mode, moon in dark mode) in the nav bar, replacing the two-button pill toggle.

**Why:** Matches the SS42 site pattern. Cleaner, takes less space, more intuitive — one click toggles the theme.

## D12 — Domain is simonsaysautomation.com (no hyphens)

**Decision:** The domain is `simonsaysautomation.com`, not `simon-says-automation.com`.

**Why:** That is the domain Simon owns and uses for email. All references must use the unhyphenated form.
