# Case illustrations: scroll reveal animation

This document fixes how large media blocks inside **case pages** (`layout: base.njk`, content under `.case-content`) get their entrance animation so authors do not need to ask for “animation” on every new illustration.

## Source of truth

- **Script:** [`scripts/scroll-reveal.js`](../scripts/scroll-reveal.js) — finds matching nodes inside `.case-content` (and hero media), adds class `scroll-reveal-target`, then toggles `is-revealed` when the element intersects the viewport (unless reduced motion or no `IntersectionObserver`).
- **Styles:** [`styles/components.css`](../styles/components.css) — under `html.has-scroll-reveal`, `.scroll-reveal-target` starts at reduced opacity + `scale(0.94)` and transitions to full visibility when `.is-revealed` is applied. **`prefers-reduced-motion: reduce`** disables the transition and shows content immediately.

## Elements that participate automatically

Keep this list aligned with `caseMediaSelector` in `scroll-reveal.js`. Today it includes:

| Selector | Typical use |
| --- | --- |
| `.case-hero .case-hero__media` | Case hero figure |
| `.case-content .case-media-grid__feature` | Featured media / video frame |
| `.case-content .case-media-grid__panel` | Grid panels with images |
| `.case-content .case-reference-illustration` | Full-width illustration above reference grids (e.g. laptop photo) |
| `.case-content .case-reference-item` | Reference grid tiles |
| `.case-content .case-reference-poster__frame` | Poster frame wrapper |
| `.case-content .case-editorial-gallery__item` | Editorial gallery tiles |
| `.case-content .case-editorial-gallery__detail` | Detail figures |
| `.case-content .mybox-media` | MyBox exported media modules |
| `.case-content .mybox-token` | MyBox palette cells |
| `.case-content .mybox-collage__item` | MyBox collage images with independent reveal |
| `.case-content .mezhdu-media` | Mezhdu Prochim large exported media modules |
| `.case-content .mezhdu-social-item` | Mezhdu Prochim social/course tiles |
| `.case-content .mezhdu-collage__media:not(.mezhdu-collage-composition)` | Mezhdu Prochim collage figure when it is a single media wrapper (no layered composition) |
| `.case-content .mezhdu-collage-composition .mezhdu-collage-composition__item` | Mezhdu Prochim tall collage: each absolute `img` layer reveals on its own as it enters the viewport |
| `.case-content .mezhdu-details__art` | Mezhdu Prochim decorative credits art |
| `.case-content .case-details__art` | Decorative art in credits/details |

When adding a **new** repeating illustration pattern:

1. Prefer reusing one of the classes above so reveal stays automatic.
2. If you introduce a **new** wrapper class for case media, add  
   `.case-content .your-new-class` to `caseMediaSelector` in `scroll-reveal.js` and extend this table.

## Manual override

Use `data-reveal="scale"` on a node only when it must animate **outside** `.case-content` or when auto-targeting is inappropriate. The same CSS applies.

## What not to do

- Do not rely on CSS-only fades on `<img>` for case illustrations unless the scroll-reveal system is intentionally bypassed (document why).
- Do not add competing transitions on properties that conflict with `.scroll-reveal-target` (opacity / transform) without checking reduced-motion behaviour.

## Mezhdu layered collage (`transform` note)

Composition items use per-layer rotation via `--mezhdu-item-transform` in [`styles/components.css`](../styles/components.css) so scroll-reveal can apply `scale()` in the same `transform` list without overwriting layout rotations. `prefers-reduced-motion` restores `transform: var(--mezhdu-item-transform)` only for those items so they stay correctly placed.

## Verification

After changing selectors, markup under `.case-content`, or reveal CSS:

- Follow [`docs/validation-playbook.md`](validation-playbook.md) for the change type (typically page template + CSS/script smoke paths).
