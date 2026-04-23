# Header blend + pinning + motion — research handoff

This document is a handoff for another agent to continue research/debugging around a **Chromium compositing constraint**:

- Keep **real** `mix-blend-mode: difference` on header text (must visually invert on light/dark sections while scrolling)
- Keep **real** blur via `backdrop-filter` on header pills
- Keep the header **visually pinned to the viewport top**
- Avoid Chromium layer isolation that breaks blend
- Reduce/avoid perceived jitter; allow “floaty” follow if it feels smoother and avoids snap-back

## TL;DR (current state)

- The blend-safe workaround is implemented in the real site (not just PoC) by:
  - keeping the header out of stacking contexts (no `fixed`, no `sticky`, no `z-index`)
  - placing `<header>` **late in DOM order** (after `main` and `footer`) so it paints on top without `z-index`
  - pinning only the **inner rail** (`.site-header__menu`) via JS by writing `style.top`
- Motion is a **continuous damped follower** (spring-damper / smoothDamp-like), not piecewise snap logic.
- Theme sampling (`data-header-theme`) is anchored to the **visible rail position** (via `getBoundingClientRect`) so contrast changes follow what the user actually sees.
- A debug lab page exists to tune parameters live: `header-motion-lab.html` (embeds `index.html` in an iframe and drives runtime params).
- Added optional “lag cap”: `MAX_FOLLOW_ERROR` limits `|renderedTop - targetTop|` when finite (default unlimited).

## Primary constraint (Chromium)

From the deep debugging report, the root cause is:

- In Chromium, `mix-blend-mode: difference` blends against the accumulated backdrop of the nearest ancestor stacking context.
- If the header is promoted into its own composited layer (common with `position: fixed/sticky` or with `z-index`), the blend group no longer contains the page content beneath — so the “difference” effect becomes visually wrong (e.g., text stays white instead of inverting).

**Do not introduce new stacking contexts in the chain from `.site-header__text` up to root**, including:

- `position: fixed` on the header
- `position: sticky` on the header
- any non-auto `z-index` on the header or ancestor chain
- `transform` / `translate` on the moving element (often creates its own layer)
- `isolation`, `filter`, `opacity < 1`, `will-change`, etc. (risk of layer isolation)

Reference: `artifacts/header-blur-mixblend-debug-report.md`.

## Files that matter

### Structure + compositing guardrails

- `index.html`
  - `<header class="site-header">` is placed after `</footer>` (late in DOM order).
  - `main`, `footer`, `header` are wrapped in `.site-shell` to keep paint order predictable without z-index battles.
- `styles/layout.css`
  - `.site-header` is `position: absolute` and intentionally **z-index free**
  - `.site-shell` establishes a shared context for main/footer/header layering without forcing header isolation
- `styles/components.css`
  - `.site-header__text` uses `mix-blend-mode: difference` and is `display: inline-block` (atomic blend box)
  - blur pills are done via `::before` with `backdrop-filter: blur(...)`
  - avoid header-local stacking contexts like `position`+`z-index` on list/link wrappers

### Motion + theme logic

- `scripts/header-theme.js` (the core runtime)
  - Moves only `.site-header__menu` via `style.top`
  - Continuous motion via `smoothDamp`
  - Theme sampling based on visible rail position
  - Runtime tuning API exposed as `window.__portfolioHeaderMotion`
  - Optional lag cap: `MAX_FOLLOW_ERROR`

### Debug tooling

- `header-motion-lab.html` + `styles/header-motion-lab.css` + `scripts/header-motion-lab.js`
  - Full-page iframe embed of `index.html`
  - Slider panel wired to `__portfolioHeaderMotion`
  - `Copy JSON` exports current params (uses `null` for unlimited `maxFollowError`)

## What was tried (timeline-ish)

### Phase 0 — “blend doesn’t show in header”

Symptoms:

- blur/overlay worked in tags/cards, but header text did not show visible `mix-blend-mode` effect.

Key rejected / partial hypotheses:

- Feature support: rejected (blend + blur supported; computed styles looked “correct”).
- `isolation` alone: not sufficient.
- Putting blend on inner spans: not sufficient in the original layout.

What was confirmed:

- Header layout created extra stacking contexts vs tags.
- Sticky/fixed overlays in Chromium are frequently isolated (layer promotion), breaking the blend group.

Reference:

- `artifacts/header-blur-mixblend-debug-report.md` (initial investigation and final resolution section)
- `artifacts/header-glass-blend-retro.md` (earlier rollback log; may be stale vs current shipped state)

### Phase 1 — “make blend work reliably” (resolution)

Final workaround that made the effect real + visible:

- Make `.site-header__text` `display: inline-block` so the blend box is atomic (Chromium does not reliably treat fragmented inline boxes as one blend root).
- Remove header-local stacking contexts in the chain (no `z-index` tricks on list/text wrappers).
- Make `.site-header` `position: absolute` with no `z-index`.
- Move `<header>` after `<footer>` in DOM order so it paints on top naturally.
- Pin via JS: update moving rail `top = scrollY` on rAF (top-only, no transforms).

### Phase 2 — “reduce jitter / micro-stutter”

Problem:

- Even with rAF, scroll-driven `top` writes can feel jittery in Chromium (layout/paint cadence, subpixel rounding, sudden settle).

Mitigations attempted:

- Device-pixel quantization (`topStep = 1 / devicePixelRatio`) to reduce subpixel shimmer.
- Split cadence: pin updates high-frequency; theme updates lower-frequency (IntersectionObserver).
- Then replaced piecewise snap logic with a continuous motion model to avoid “snap-back” on scroll stop.

Current motion model:

- `smoothDamp` integrating position + `velocity` each frame with `dt`
- Continue easing after scroll stops until settle thresholds are met
- Reduced-motion: hard snap `renderedTop = targetTop`

### Phase 3 — “tuning iteration”

We iterated aggressively on parameters to get:

- faster response to scroll (snappy follow)
- still smooth, no last-step snap-back

Current “live” parameters at time of writing (these change often; treat as tunable):

- `SMOOTH_TIME`
- `MAX_FOLLOW_SPEED`
- `SETTLE_DISTANCE_EPSILON`
- `SETTLE_VELOCITY_EPSILON`
- `MAX_FOLLOW_ERROR` (default unlimited; finite clamps lag)

## Current implementation highlights (what to reuse)

### Lag cap semantics

In `scripts/header-theme.js`:

- `MAX_FOLLOW_ERROR = Infinity` by default
- When finite, clamp the motion output after `smoothDamp`:
  - `renderedTop = clamp(renderedTop, targetTop - MAX_FOLLOW_ERROR, targetTop + MAX_FOLLOW_ERROR)`
  - If clamped, `velocity = 0` to avoid “fighting” the boundary

Runtime API:

- `getParams()` returns `maxFollowError: null` when unlimited (because JSON can’t represent Infinity).
- `setParams({ maxFollowError: null })` restores unlimited.

### Theme sampling anchored to visible rail

Theme pick uses a sample point derived from:

- `movingRailEl.getBoundingClientRect()`
- sample just below the rail (`railRect.bottom + 2`)

This avoids contrast desync when the rail is intentionally lagging behind `scrollY`.

## Verification & known test noise

Playwright smoke scripts:

- `npm run smoke:visual` can intermittently timeout on Chromium fullPage screenshots; retry with a longer timeout if needed.
- `smoke:a11y` has a **known pre-existing horizontal overflow** issue (footer/model image sizing) in some states; do not confuse with header work.
- `smoke:live` has a known `heroOverlapArea` failure (pre-existing hero layout issue) in some states; unrelated to header motion.

Manual checks to focus on (Chromium):

- slow wheel scroll near top
- aggressive inertial trackpad flick
- abrupt stop after fast flick (confirm no snap-back)
- hero → light section → dark section → footer
- confirm blur stays visible and blend actually inverts across sections

## Open questions / next research directions

If the motion still feels imperfect in Chromium even with a damped follower:

1. **Minimize repaint area**
  - The rail contains blur pills; moving them via `top` can be paint-heavy.
  - Explore reducing moving surface (e.g., move only a narrow sub-rail) while keeping blend-safe chain.
2. **Alternative “pinning without transforms”**
  - Still no transforms, no fixed/sticky on blend chain.
  - Explore if there’s a way to avoid layout-affecting `top` writes (likely hard under constraints).
3. **Better velocity handling at lag cap**
  - Current approach zeros velocity when clamped.
  - Research whether projecting/clamping velocity component yields better feel without oscillation.
4. **Investigate Chrome compositor scheduling**
  - Is there any observable correlation between scroll events, rAF timing, and layout jitter?
  - Potentially instrument frame-to-frame deltas and compare on different refresh rates (60/120Hz).

## How to use this handoff

For research, start from:

- `scripts/header-theme.js`
- `index.html`, `styles/layout.css`, `styles/components.css` (blend-safe chain)
- `header-motion-lab.html` (fast tuning)

Do not propose solutions that require reintroducing:

- sticky/fixed on header
- transform-based pinning
- z-index/isolation/opacity/filter/will-change in the blend chain