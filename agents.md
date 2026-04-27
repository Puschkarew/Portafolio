# Project instructions

## What this project is

This is a hand-coded website built from Figma designs.
Default stack: Eleventy-generated plain HTML, CSS, and minimal JavaScript.

## Agent docs map

- Start with [docs/agent-docs-index.md](docs/agent-docs-index.md) when choosing which project document to read.
- Build workflow: [docs/eleventy-build-workflow.md](docs/eleventy-build-workflow.md).
- Page authoring: [docs/page-authoring-guide.md](docs/page-authoring-guide.md).
- Validation matrix: [docs/validation-playbook.md](docs/validation-playbook.md).

## Build workflow

- Source templates live in `src/`.
- Generated output lives in `dist/` and is ignored by git.
- Run `npm run build` before validating generated HTML or opening `dist/index.html` directly.
- Run `npm run dev` for the local Eleventy dev server.
- Do not edit `dist/` by hand.

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

The header is **working as designed**. Treat it as **frozen behavior** unless the task explicitly asks to change the header.

- **Spec of record:** [artifacts/header-glass-blend-implementation-handoff.md](artifacts/header-glass-blend-implementation-handoff.md) — architecture (four layers: fixed glass, source `header`, fixed visual text clones, fixed hit links), DOM shape, tokens, CSS/JS responsibilities, and validation checklist.
- **Do not:** change header DOM, stacking, blend, glass, fixed visual text clones, hit links, or `scripts/header-theme.js` assumptions without reading the spec first.
- **Validation:** if you touch header markup or styles, follow [docs/validation-playbook.md](docs/validation-playbook.md).

## Site footer — do not regress

The footer uses the **area17-style reveal** and is **frozen behavior** unless the task explicitly asks to change the footer pattern.

- **Spec of record:** [docs/session-area17-footer-reveal.md](docs/session-area17-footer-reveal.md) — layer tokens, `main` + `.section.section--footer.site-footer` rules, anchors.
- **Do not:** change `main`/footer stacking, make `main` transparent, or add footer z-index JavaScript without reading the spec first.
- **Validation:** re-run footer checks from [docs/validation-playbook.md](docs/validation-playbook.md) after footer or main layout/z-index changes.

## Before finishing

- List changed files.
- Summarize what was fixed.
- Mention remaining mismatches with Figma, if any.
