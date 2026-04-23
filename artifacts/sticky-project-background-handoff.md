# Sticky project backgrounds — handoff (chat summary)

## Goal (product behavior)

Implement project sections (Schrift Collective, Made by Mad, Odds & Ends, In Curves) so they **do not “butt-join”** visually on scroll.

On desktop (≥1024px):

- **Before a section becomes sticky**: the upcoming project may be visible in the flow, but **the background stays as the previously active project**.
- **At sticky moment**: background and project artwork should transition (original request: opacity at the moment the header sticks).
- Later update: transition should be **scroll-linked** (crossfade) over the last **25vh** before the next section header reaches the top.

Text styling can be “its own” even before sticky; only **background + project art** are tied to the transition.

## Final behavior implemented

Desktop (≥1024px):

- A fixed viewport-sized “background stage” sits behind the content.
- The stage holds:
  - a **base white** layer (always on) to prevent footer bleed-through
  - 4 project layers (featured/madebymad/odds/curves) whose opacity is driven by scroll
- The “active” project is defined as when its `.section-header` reaches the viewport top (sticky contact point).
- Between sticky moments, background/art **crossfade** from current → next over the last **25vh** before the next header hits `top: 0`.

Mobile (<1024px):

- Sticky behavior is disabled (existing layout preserved).

## Key implementation details

### Background stage markup

File: `index.html`

- Inserted `.project-background-stage` right inside `.site-shell`, before `<main>`.
- Added `data-project` attributes to each project section:
  - `featured`, `madebymad`, `odds`, `curves`
- Added a hidden `.project-background-theme-sampler` with `data-header-theme` to keep header theme aligned with the currently active background (and avoid “early” header theme switches caused by upcoming sections).

### CSS changes

Files: `styles/layout.css`, `styles/components.css`

- On desktop, project sections’ own `background` is overridden to `transparent` so they do not change the page background early.
- Project background layers use `--project-layer-opacity` (per-layer CSS variable) for scroll-driven opacity.
- Project artwork (and Odds shader container) uses `--project-art-opacity` (per-section CSS variable) for scroll-driven opacity.
- Base background layer `.project-background-layer--base` is always visible to avoid seeing the sticky footer “through” a transparent main.

### Scroll logic

File: `scripts/project-sticky-background.js`

- Uses a `requestAnimationFrame` loop triggered by scroll/resize.
- Determines sticky “active” when `.section-header` is at the top (with small tolerance).
- Computes scroll-linked crossfade:
  - Find current active section (most recently stuck).
  - Identify the next section in DOM order.
  - Read `nextHeader.getBoundingClientRect().top`.
  - Convert to progress `t` over `25vh`:
    - `t = clamp01((window.innerHeight*0.25 - top) / (window.innerHeight*0.25))`
  - Apply opacities:
    - current layer/art: `1 - t`
    - next layer/art: `t`

## Changed files

- `index.html`
- `styles/layout.css`
- `styles/components.css`
- `scripts/project-sticky-background.js` (new)
- `tests/smoke/home.visual.spec.ts` (timeout adjustment)
- `playwright.config.ts` (Firefox removed from projects per follow-up request)

## How to validate quickly

Recommended local preview (already used in this repo): `http://127.0.0.1:4173/`

Desktop:

- Scroll from Schrift → Made by Mad:
  - while “Made by Mad” text appears but header hasn’t hit top, background stays Schrift
  - in the last ~25vh before sticky, background and art crossfade
  - when header touches top, Made by Mad is fully on

## Notes / known constraints

- Firefox project was removed from Playwright config at user request (“пока без Firefox”). If cross-browser parity becomes important again, re-add Firefox and run `npx playwright install` as needed.

