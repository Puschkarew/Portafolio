# Project Sticky Transition + Blur Art Handoff

Date: 2026-04-24

## Purpose

This document describes how to port the experimental project-section transition system into another build of the portfolio site.

The desired behavior is:

- Desktop only: `>= 1024px`.
- Each project section keeps the existing `.section-header` sticky model.
- A section transition starts only when that section's `.section-header` reaches `top: 0`.
- Transition length is exactly `50vh`.
- Background color, text appearance, and background art are all driven by the same scroll progress `t`.
- The first project transitions from a `prelude` visual state into `featured`.
- All transitions are reversible on scroll-up.
- Project background art is fixed inside the projects area and crossfades with blur.
- Footer reveal remains intact: the project stage must detach at the end of the last project.

## Files To Port

Port these files or their equivalent local blocks:

- `index.html`
- `styles/project-background.css`
- `scripts/project-sticky-background.js`
- `scripts/odds-humans-shader-init.js`
- `tests/smoke/home.project-transitions.spec.ts`
- `tests/smoke/home.footer-reveal.spec.ts`
- `package.json` only if the target build does not already expose equivalent smoke scripts

Do not change the frozen header architecture unless the target build has a different header system and needs explicit integration.

## Current Runtime Contract

The implementation relies on these DOM contracts:

- Project sections are inside `.projects-area`.
- Each project section has `data-project`.
- Project ids are, in order: `featured`, `madebymad`, `odds`, `curves`.
- Each project section contains `.section-header` and `.section-header__content`.
- Header theme is read from each project section's `data-header-theme`.
- A stage exists inside `.projects-area` before the project sections:
  - `.project-background-stage-shell`
  - `.project-background-stage`
  - `[data-bg-layer]`
  - `[data-art-for]`
- Hidden color refs exist in `.project-color-refs` and provide the source colors for title, body, and meta text.
- Desktop Odds shader mounts into `#humans-shader-stage`.
- Mobile/tablet Odds shader keeps using the local fallback root `#humans-shader`.

## HTML Changes

Add `styles/project-background.css` after the existing base layout styles:

```html
<link rel="stylesheet" href="styles/project-background.css" />
```

Inside `.projects-area`, before the real project sections, add the shared stage:

```html
<div class="project-background-stage-shell" aria-hidden="true">
  <div class="project-background-stage">
    <div class="project-background-layer project-background-layer--base"></div>
    <div class="project-background-layer" data-bg-layer="prelude"></div>
    <div class="project-background-layer" data-bg-layer="featured"></div>
    <div class="project-background-layer" data-bg-layer="madebymad"></div>
    <div class="project-background-layer" data-bg-layer="odds"></div>
    <div class="project-background-layer" data-bg-layer="curves"></div>

    <div class="project-background-art project-background-art--featured" data-art-for="featured">
      <div class="project-background-art__inner">
        <img src="assets/figma/Section/Schrift Collective Background.svg" alt="" width="1336" height="996" loading="lazy" decoding="async" />
      </div>
    </div>

    <div class="project-background-art project-background-art--madebymad" data-art-for="madebymad">
      <div class="project-background-art__inner">
        <img src="assets/figma/Hourglass.png" alt="" width="948" height="1279" loading="lazy" decoding="async" />
      </div>
    </div>

    <div class="project-background-art project-background-art--odds" data-art-for="odds">
      <div class="project-background-art__inner">
        <div id="humans-shader-stage" class="humans-shader-slot" aria-hidden="true"></div>
      </div>
    </div>

    <div class="project-background-art project-background-art--curves" data-art-for="curves">
      <div class="project-background-art__inner">
        <img src="assets/figma/Image%20In%20Curves.svg" alt="" width="2185" height="1448" loading="lazy" decoding="async" />
      </div>
    </div>
  </div>
</div>
```

Then add hidden color references. They must mirror the section classes because computed CSS variables are sampled from these nodes:

```html
<div class="project-color-refs" aria-hidden="true">
  <section class="section section--prelude-color-ref project-color-ref" data-color-ref="prelude">...</section>
  <section class="section section--featured project-color-ref" data-color-ref="featured">...</section>
  <section class="section section--madebymad project-color-ref" data-color-ref="madebymad">...</section>
  <section class="section section--odds project-color-ref" data-color-ref="odds">...</section>
  <section class="section section--curves project-color-ref" data-color-ref="curves">...</section>
</div>
```

Each ref section must contain:

- `h2.section-title`
- `p.prose.section-title`
- `p.section-header__meta`

At the bottom of `index.html`, load the project transition script after the header and shader scripts:

```html
<script src="scripts/header-theme.js" defer></script>
<script src="assets/humans-shader/humans-shader-embed.js" defer></script>
<script src="scripts/odds-humans-shader-init.js" defer></script>
<script src="scripts/project-sticky-background.js" defer></script>
```

## CSS Changes

Create or port `styles/project-background.css`.

Core requirements:

- Default stage is hidden.
- Enable desktop stage only through `html.has-project-sticky-scrub`.
- `.project-background-stage-shell` is `position: sticky; top: 0; block-size: 100vh; margin-block-end: -100vh`.
- The shell lives inside `.projects-area`, not globally between `main` and `footer`.
- Project sections become transparent visual carriers on desktop, while the stage owns backgrounds and art.
- Local in-section art remains available for mobile/tablet fallback.
- The last `curves` section restores its local background/art when the stage detaches for footer reveal.

Important rules to preserve:

```css
.project-background-stage-shell,
.project-background-stage {
  display: none;
}

html.has-project-sticky-scrub .projects-area {
  position: relative;
  isolation: isolate;
}

html.has-project-sticky-scrub .project-background-stage-shell {
  position: sticky;
  top: 0;
  z-index: 0;
  display: block;
  block-size: 100vh;
  margin-block-end: -100vh;
  pointer-events: none;
  overflow: hidden;
  opacity: 1;
}

html.has-project-sticky-scrub .project-background-stage {
  position: relative;
  display: block;
  block-size: 100%;
  overflow: hidden;
  isolation: isolate;
}
```

Background layers:

```css
html.has-project-sticky-scrub .project-background-layer--base,
html.has-project-sticky-scrub [data-bg-layer],
html.has-project-sticky-scrub .project-background-art {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: none;
}

html.has-project-sticky-scrub .project-background-layer--base {
  z-index: 0;
  background: var(--color-surface-page);
  opacity: 1;
}

html.has-project-sticky-scrub [data-bg-layer] {
  z-index: 1;
  opacity: 0;
}
```

Artwork blur:

```css
html.has-project-sticky-scrub .project-background-art {
  z-index: 2;
  opacity: 0;
  --project-art-blur: 32px;
}

html.has-project-sticky-scrub .project-background-art img,
html.has-project-sticky-scrub .project-background-art--odds .humans-shader-slot {
  filter: blur(var(--project-art-blur));
}
```

The target blur budget is `32px`.

Local fallback and footer detach:

```css
html.has-project-sticky-scrub .projects-area [data-project] {
  position: relative;
  z-index: 1;
  background: transparent;
}

html.has-project-sticky-scrub .projects-area [data-project] .section-header__art {
  opacity: 0;
  pointer-events: none;
  transition: none;
}

html.has-project-sticky-scrub.is-project-stage-detached .project-background-stage-shell {
  opacity: 0;
}

html.has-project-sticky-scrub.is-project-stage-detached .projects-area [data-project="curves"] {
  background: var(--color-surface-in-curves);
}

html.has-project-sticky-scrub.is-project-stage-detached .projects-area [data-project="curves"] .section-header__art {
  opacity: 1;
}

html.has-project-sticky-scrub.is-project-stage-detached .projects-area [data-project="curves"] .section-header__art img {
  filter: none;
}
```

Do not add `backdrop-filter`, transforms, movement, parallax, scale, easing, or time-based CSS transitions for the art handoff.

## JavaScript Changes

Create or port `scripts/project-sticky-background.js`.

Constants:

```js
var PROJECT_ORDER = ["featured", "madebymad", "odds", "curves"];
var PRELUDE = "prelude";
var MQ = "(min-width: 1024px)";
var TRANSITION_RATIO = 0.5;
var ART_MAX_BLUR_PX = 32;
```

Desktop activation:

- Use `window.matchMedia("(min-width: 1024px)")`.
- Add `html.has-project-sticky-scrub` only on desktop.
- Remove all inline text/stage styles on disable.
- Support `prefers-reduced-motion: reduce` by snapping `t` to `0` before sticky and `1` after sticky.

Geometry:

- Cache project sections with `.projects-area section[data-project]`.
- For each project, cache:
  - `id`
  - `section`
  - `.section-header__content`
  - `startY = section.getBoundingClientRect().top + window.scrollY`
- `startY` is the sticky-start trigger because the existing `.section-header` sticks at section top.
- Recompute geometry on resize and load.

Progress:

```js
var transitionPx = window.innerHeight * TRANSITION_RATIO;
var rawProgress = (window.scrollY - displayProject.startY) / transitionPx;
var t = reducedMotion ? (window.scrollY >= displayProject.startY ? 1 : 0) : clamp01(rawProgress);
```

Pair model:

- `from = prevId(displayProject.id)`
- `to = displayProject.id`
- First section: `from = "prelude"`, `to = "featured"`

Layer opacity:

```js
function layerOpacity(id, pair) {
  var fromOpacity = pair.from === id ? 1 - pair.t : 0;
  var toOpacity = pair.to === id ? pair.t : 0;
  return fromOpacity + toOpacity;
}
```

Art blur:

```js
function artBlur(id, pair) {
  if (pair.from === id) {
    return ART_MAX_BLUR_PX * pair.t;
  }

  if (pair.to === id) {
    return ART_MAX_BLUR_PX * (1 - pair.t);
  }

  return ART_MAX_BLUR_PX;
}
```

Stage application:

```js
function applyStage(pair) {
  var index;

  for (index = 0; index < bgLayers.length; index += 1) {
    var bgId = bgLayers[index].getAttribute("data-bg-layer");
    bgLayers[index].style.opacity = String(layerOpacity(bgId, pair));
  }

  for (index = 0; index < artLayers.length; index += 1) {
    var artId = artLayers[index].getAttribute("data-art-for");
    artLayers[index].style.opacity = String(layerOpacity(artId, pair));
    artLayers[index].style.setProperty("--project-art-blur", round3(artBlur(artId, pair)) + "px");
  }
}
```

Text transition:

- Do not animate layout.
- Interpolate only computed text colors sampled from `.project-color-refs`.
- Apply inline `color` to the visible section's:
  - `h2.section-title`
  - `p.prose.section-title`
  - `p.section-header__meta`
- Clear text colors before applying a new frame to avoid accumulated state.

Header theme:

- Keep the header architecture frozen.
- Only set `html[data-header-theme]`.
- Use source theme while `t < 0.5`.
- Use target theme when `t >= 0.5`.

Footer detach:

- At the end of the last project, when `curves` has completed `t = 1` and `.projects-area` bottom is at or above viewport bottom, add `html.is-project-stage-detached`.
- In detached mode:
  - hide the stage shell with opacity
  - clear text colors
  - let the local `curves` background and art render sharp
- This preserves the area17-style footer reveal.

Debug hook:

Expose this read-only hook for tests:

```js
window.__portfolioProjectScrub = {
  getState: function () {
    return {
      pair: { from: lastState.pair.from, to: lastState.pair.to, t: lastState.pair.t },
      displayId: lastState.displayId,
      mode: lastState.mode,
      transitionPx: lastState.transitionPx,
      projects: lastState.projects.slice()
    };
  }
};
```

## Odds Shader Mount

Update `scripts/odds-humans-shader-init.js` so the shader root depends on viewport:

```js
function getRoot() {
  return mq.matches
    ? document.getElementById("humans-shader-stage")
    : document.getElementById("humans-shader");
}
```

The desktop stage root participates in the blur handoff through CSS:

```css
html.has-project-sticky-scrub .project-background-art--odds .humans-shader-slot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

html.has-project-sticky-scrub .project-background-art--odds canvas {
  width: 100% !important;
  height: 100% !important;
  max-width: none;
}
```

## Test Coverage

Add or update `tests/smoke/home.project-transitions.spec.ts`.

The smoke test should verify at desktop viewport `1512x900`:

- Debug hook enters `mode === "desktop"`.
- `transitionPx === viewport.height * 0.5`.
- For `featured -> madebymad`:
  - before sticky: `t = 0`, featured background/art visible, madebymad hidden
  - at sticky start: `t = 0`
  - mid transition: `t ~= 0.5`
  - end transition: `t = 1`
  - scroll-up returns to `t = 0`
- Text colors match source at `t = 0`, target at `t = 1`, and linear mix at `t = 0.5`.
- Background layer opacities match source/target linear mix.
- Artwork blur and opacity match the blur crossfade:
  - `t = 0`: previous art opacity `1`, blur `0px`; next art opacity `0`, blur `32px`
  - `t = 0.5`: both opacity `0.5`, both blur `16px`
  - `t = 1`: previous art opacity `0`, blur `32px`; next art opacity `1`, blur `0px`
- Odds shader layer also blurs during `madebymad -> odds`.

Add or keep `tests/smoke/home.footer-reveal.spec.ts`.

Footer smoke should verify:

- `main` z-index remains above footer z-index.
- Footer is visible at end scroll.
- On desktop, `html.is-project-stage-detached` is present at end scroll.
- Stage shell opacity is effectively `0`.
- `curves` local background is non-transparent.

Required scripts:

```json
{
  "smoke:projects": "playwright test tests/smoke/home.project-transitions.spec.ts",
  "smoke:visual": "playwright test tests/smoke/home.visual.spec.ts"
}
```

## Verification Checklist

Run:

```sh
npm run smoke:projects
npm run smoke:visual
npx playwright test tests/smoke/home.footer-reveal.spec.ts
```

Manual browser pass:

- Desktop width `>= 1024px`.
- Slowly scrub into `Made by Mad`.
- At sticky start, incoming section still visually matches previous project.
- Over the next `50vh`, background, text, and art change together.
- Art handoff is blur plus opacity, not movement.
- Scroll back up and confirm the exact reverse state with no flicker.
- Scrub into `Odds` and confirm the shader layer blurs in/out.
- Scroll to footer and confirm the footer reveal still comes from underneath main.

Cross-browser:

- Chromium is the baseline.
- Firefox should be checked because this uses sticky/fixed-style composition plus CSS `filter`.
- Safari/WebKit should be checked manually on key desktop viewport if available.

## Non-Goals

Do not add:

- parallax
- transforms for the transition
- scale animation
- movement animation
- blur through `backdrop-filter`
- easing
- delayed playback
- time-based transitions
- layout animation for text
- JS state that can drift away from actual scroll position

## Known Pitfalls

- Do not place a full-viewport fixed stage between `main` and `footer`; it breaks the footer reveal.
- Do not leave desktop project sections transparent after the stage detaches at the end of `curves`; the footer can bleed through.
- Do not drive the art with CSS transitions; opacity and blur must be written deterministically from scroll progress.
- Do not remove local section art; it is still needed for mobile/tablet and for the detached `curves` end state.
- Do not make `.site-header` fixed/sticky or change its stacking model as part of this feature.
- Do not sample text colors from visible project nodes while inline colors are being written; use hidden refs to avoid feedback loops.

## Acceptance Criteria

The update is complete when:

- Desktop project transitions begin only after sticky start.
- Each transition lasts `50vh`.
- First project starts from `prelude`.
- Background color, text color, art opacity, and art blur all share the same `t`.
- Art blur uses max `32px`.
- Scroll-up reverses without jumps or stale inline styles.
- Reduced motion snaps deterministically.
- Mobile/tablet fallback remains unchanged.
- Header behavior remains visually unchanged except for intended theme crossover.
- Footer reveal still passes its smoke test.

