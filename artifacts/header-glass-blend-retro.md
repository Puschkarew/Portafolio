---

## title: Header glass vs blend — work log
date: 2026-04-22
scope:
  - site header pills (`.site-header__nav`, `.site-header__contact`, `.site-header__mobile-trigger`)
  - project tags (`.tag`, `.tag__text`)
status: resolved_as: "header uses glass only (no blend)"

## TL;DR

We tried to apply **blend modes** to the header and to the “Get in touch” pill so the overlay would “interact with content behind”.
In practice, **Chromium/Electron compositing** made `mix-blend-mode` + header overlay unreliable: **blur appeared to vanish** and the **blend effect did not manifest** for the fixed header.

Final decision: **keep header as glass only** (`backdrop-filter: blur(...)` + extremely low tint), and **remove `mix-blend-mode` from header text** for stability.
Project card tags keep their blend behavior.

## What the code looked like (starting point)

- Header pills render “glass” via a pseudo-element:
  - `styles/components.css`: `.site-header__*::before { background: var(--header-overlay-bg); backdrop-filter: blur(var(--header-overlay-blur)); }`
- Project tags render “glass” via `.tag::before` and apply `mix-blend-mode: difference` on `.tag__text`.

## Key learnings

### 1) `background-blend-mode` vs `mix-blend-mode`

- `**background-blend-mode`** only blends **background layers within the same element**. With a single `background` layer it has no effect on “content behind”.
- For “interaction with backdrop”, you need `**mix-blend-mode`** (usually on the overlay pseudo-element).

### 2) Why `plus-lighter` on a near-black tint is visually weak

`plus-lighter` is additive. With a nearly-black overlay (e.g. `rgba(0,0,0,0.12)`), there’s little to add, so the effect is subtle to invisible.

### 3) Header vs tag behavior differs (important!)

Even when computed styles reported:

- `backdrop-filter: blur(...)` on header `::before`, and
- `mix-blend-mode: difference` on header text,

the **fixed header** still did not show visible blur/blend.
Project tags, however, continued to work as expected.

This strongly suggests a **compositing / stacking-context issue** specific to the header’s layout (fixed/sticky overlays are commonly isolated into their own layer in Chromium/Electron).

## Experiments we ran

### A) Apply blend to header overlay via tokens (rolled back)

- Added `mix-blend-mode: var(--header-overlay-blend)` to `.site-header__*::before`
- Set `--header-overlay-blend: plus-lighter`
Outcome: visually inconsistent; led to “blur disappears” reports → rolled back.

### B) “Glass without blend” (kept)

- Removed `mix-blend-mode` from header/overlay pseudos
- Made tint extremely small to get “almost fully transparent glass”
Current tint token:
- `styles/tokens.css`: `--color-tag-overlay: rgba(0, 0, 0, 0.001)` (0.1%)

### C) Remove saturation from blur (kept)

Header overlay blur is now just:

- `backdrop-filter: blur(var(--header-overlay-blur))`

### D) Workaround attempt for Chromium bug (rolled back)

We tested the known workaround from StackOverflow (adding a noop `backdrop-filter` to an element with `mix-blend-mode`).
Outcome: did not fix the header behavior in this environment → rolled back.

### E) Header pinning without fixed/sticky (rolled back)

Tried `position: absolute` + JS syncing `top = scrollY` to avoid fixed/sticky compositing.
Outcome: did not restore blur/blend as desired, and increased complexity → rolled back.

### F) Header layering adjustments (kept)

Adjusted z-index layering so the header `::before` sits below text without using negative z-index.

## Final state (what we shipped)

### Header

- **Glass overlay stays**: `backdrop-filter: blur(...)`
- **Blend removed from header text**:
  - `styles/components.css`: `.site-header__text { mix-blend-mode: normal; }`
- **Fixed positioning restored** for correct UX.

### Tags (project cards)

- Tags continue using:
  - `.tag::before` for glass blur
  - `.tag__text { mix-blend-mode: difference; }`

## Verification

- CSS lint: `npm run lint:css` passed
- Visual smoke tests: `npm run smoke:visual` passed (Chromium + Firefox)

## Follow-ups (optional)

If you still want “inverted” header text that adapts to backgrounds:

- Prefer a **deterministic approach** (per-section theme variables that set header text color), rather than `mix-blend-mode` inside a fixed header.
- Or render the header inside the document flow (no fixed/sticky) and emulate stickiness differently, accepting constraints.