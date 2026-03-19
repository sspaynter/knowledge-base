---
title: "#227 Contact Section Sketch Style — Design Spec"
status: published
author: both
created: 2026-03-19
updated: 2026-03-19
---

# #227 Contact Section Sketch Style — Design Spec

**Date:** 2026-03-19
**Status:** Approved
**Prototype:** `.superpowers/brainstorm/12611-1773888319/contact-sketch-v2.html`

## Overview

Apply the hand-drawn sketch style (already on services and background sections) to the contact section. Add a sitting Simon character. Restyle the submit button from solid orange pill to hand-drawn rectangle.

## Decisions

### D1: Sketch borders on form inputs
- Wobbly SVG borders on all three form elements: name input, email input, message textarea
- Same `sizeSketchBorders()` system used by services and background sections
- No CSS `border-radius` — the sketch border replaces the rounded corners
- Input background remains `var(--input-bg)` with no native border
- Wobble amount: inputs are short height (~48px) so the `h < 100` check in `sizeSketchBorders()` will apply 1.2 wobble — this is correct and matches the chip/small-element feel

### D2: Focus state
- On input focus, sketch border paths change stroke colour to `var(--accent)` (#ED4C05)
- CSS sibling selectors for both input and textarea:
  - `.sketch-input-wrap input:focus ~ .sketch-border path`
  - `.sketch-input-wrap textarea:focus ~ .sketch-border path`

### D3: Hand-drawn rectangle button
- Replace solid orange pill (`border-radius: 980px; background: var(--accent)`) with:
  - No background fill
  - Orange text (`var(--accent)`), Archivo 16px weight 600
  - Sketch SVG border (same wobbly system)
  - Hover: text brightens to `#ff6a2a`, border paths turn orange
- Button padding: `14px 44px`
- Stroke weight: add `isBtn = parent.classList.contains('sketch-btn-wrap')` check in `sizeSketchBorders()` with `baseWeight = 2.2` (heavier than chips at 1.6, lighter than cards at 2.6)

### D4: Sitting Simon character
- Image: `simon_white- rectangle glasses sitting - transparent.png` (from `Mockup/` directory)
- Deploy to: `site/themes/ssa/static/images/simon-sitting.png` (copy and rename — source filename has spaces, quote the path)
- Position: right side of form, bottom-aligned with flex `align-self: flex-end`
- Width: 140px
- Mirrored: `transform: scaleX(-1)` on the `<img>` element
- Rotation: `rotate(-5deg)` on the container, `transform-origin: bottom center`
- Margin: `margin-left: -6px` to tuck close to form content
- No CSS filters in either dark or light mode (same rule as hero character)

### D5: Layout restructure

The contact section uses a two-level flex layout:

```
.contact-layout (flex row, align-items: flex-end, gap: 0, max-width: 680px)
├── .contact-main (flex: 1)
│   ├── form.contact-form (flex column, gap: 14px)
│   │   ├── .sketch-input-wrap (name)
│   │   ├── .sketch-input-wrap (email)
│   │   ├── .sketch-input-wrap (textarea)
│   │   ├── honeypot field (unchanged)
│   │   └── #form-status (unchanged — stays inside form, appears below last input)
│   └── .contact-footer (flex column, align-items: flex-end, margin-top: 14px)
│       ├── .sketch-btn-wrap (submit button)
│       └── .contact-info (email + LinkedIn, text-align: right)
└── .contact-character (flex: 0 0 140px, align-self: flex-end)
    └── img (mirrored, rotated)
```

The submit button is `type="submit"` but sits outside the `<form>` element. Add a `form="contact-form"` attribute so it still submits the form.

### D6: Contact info styling
- Text-align right (to sit near the character)
- Colours unchanged: `var(--text-tertiary)` for text, `var(--text-secondary)` for links
- Link hover: `var(--accent)`

### D7: Mobile responsive
- Below 768px (matching existing contact breakpoint): layout stacks vertically
- Character centres below form at 120px width, no negative margin, no rotation
- Button and contact info left-align
- Replaces existing `.contact-wrap { max-width: 100%; }` rule at 768px

## Files to modify

- `site/themes/ssa/layouts/partials/contact.html` — restructure HTML: wrap in contact-layout/contact-main, add sketch-border SVGs to inputs, move button into contact-footer with sketch-btn-wrap, add contact-character with img, add `form="contact-form"` to button
- `site/themes/ssa/assets/css/main.css` — replace `.contact-form input/textarea` rounded border styles with sketch-input-wrap styles; replace `.contact-form button` pill styles with sketch-btn styles; add contact-character and contact-footer layout; update 768px breakpoint
- `site/themes/ssa/assets/js/main.js` — add `isBtn = parent.classList.contains('sketch-btn-wrap')` check in `sizeSketchBorders()` before the existing class checks, with `baseWeight = 2.2`
- `site/themes/ssa/static/images/simon-sitting.png` — new file (copy from `Mockup/` directory, rename)

## Does not change

- Form submission logic (webhook to n8n)
- Honeypot spam field
- Form status messages (success/error) — `#form-status` stays inside the `<form>`
- Section title "Get In Touch" and subtitle
- Contact info content (email address, LinkedIn URL)
