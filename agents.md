# Project instructions

## What this project is

This is a hand-coded website built from Figma designs.
Default stack: plain HTML, CSS, and minimal JavaScript.

## How to work

- Implement only the requested block, section, or file.
- Start with a short plan.
- Prefer refactor over rewrite when possible.
- If rewrite is necessary, rewrite only one local block at a time.
- Do not change unrelated content, styles, or structure.

## Figma-first workflow

- Use the exact Figma frame or node, not the whole page, unless explicitly asked.
- Get design context and screenshot before implementation.
- Use Figma variables/tokens when available.
- Treat Figma output as a reference, then translate it into this repo's conventions.
- Validate the result against Figma before finishing.

## HTML/CSS standards

- Semantic HTML first.
- Mobile-first CSS.
- Grid for page layout, Flexbox for component alignment.
- No floats for layout.
- No absolute positioning as the main structure.
- Use gap over spacing hacks.
- Use CSS custom properties for reusable values.
- Prefer BEM-like class naming unless the repo already uses another consistent system.
- No inline styles unless truly necessary.
- No unnecessary wrappers.
- No new CSS framework unless explicitly requested.

## Accessibility

- Preserve logical DOM and focus order.
- Keep focus visible.
- Do not remove outlines without a replacement.
- Avoid horizontal scroll in normal content.
- Respect reduced motion when animation is non-essential.

## Performance

- Keep CSS lean.
- Avoid unnecessary dependencies.
- Prefer responsive images.
- Be careful with fonts, shadows, filters, and oversized media.

## Browser priority and verification

- Browser priority for this project: Chromium first, Firefox second, Safari third.
- For visual effects (`backdrop-filter`, `mix-blend-mode`, sticky/fixed overlays), verify at least Chromium + Firefox before completion.
- For Safari, run a manual pass on key viewports and capture screenshots when visual effects are touched.
- If behavior differs across engines, optimize for Chromium first, then align Firefox and Safari without breaking Chromium baseline.

## Site header — do not regress

The header is **working as designed** (glass blur, `mix-blend-mode: difference` on labels, correct stacking above canvas/sticky content, stable text on scroll, pointer hitboxes). Treat it as **frozen behavior** unless the task explicitly asks to change the header.

- **Spec of record:** [artifacts/header-glass-blend-implementation-handoff.md](artifacts/header-glass-blend-implementation-handoff.md) — architecture (four layers: fixed glass, source `header`, fixed visual text clones, fixed hit links), DOM shape, tokens, CSS/JS responsibilities, and validation checklist.
- **Do not:** put a high `z-index` (or `transform` / `isolation` / `opacity < 1`) on `.site-header`; make the header `position: fixed` or `sticky`; move `backdrop-filter` back into moving rail `::before`; replace fixed **span** visual text with blend on fixed **link** text; run per-scroll geometry sync for overlays when only `scrollY` pin is needed.
- **Runtime:** [scripts/header-theme.js](scripts/header-theme.js) — exact rail `top = scrollY`, geometry sync on layout events (not every scroll). It does **not** set `data-header-theme` (single glass style only). If you touch header markup or styles, re-run `npm run smoke:structure` and `npm run smoke:visual`.

## Site footer — do not regress

The footer uses the **area17-style reveal**: `main` stays **above** the footer in the stacking order; on scroll, content **lifts** and the footer is **revealed from underneath** (not as a plain “next block” in the same visual layer). This is **frozen behavior** unless the task explicitly asks to change the footer pattern.

- **Spec of record:** [docs/session-area17-footer-reveal.md](docs/session-area17-footer-reveal.md) — layer tokens, `main` + `.section.section--footer.site-footer` rules, anchors.
- **Smoke test:** [tests/smoke/home.footer-reveal.spec.ts](tests/smoke/home.footer-reveal.spec.ts) — re-run after footer or main layout/z-index changes.
- **Do not:** set `main` to `background: transparent` for “project backgrounds” without an agreed replacement; reintroduce a full-viewport fixed background **stage** between `main` and the footer; add JS that toggles footer `z-index` at scroll boundaries; make project sections `background: transparent` on desktop in a way that lets the footer show **through** `main`. Those patterns break the reveal and/or recreate old bleed bugs.

## Before finishing

- List changed files.
- Summarize what was fixed.
- Mention remaining mismatches with Figma, if any.