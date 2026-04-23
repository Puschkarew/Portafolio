# Header blur/mix-blend debug report

## Context

- Initial bug: blur and overlay worked in project tags/cards, but in the header the text looked like it had no visible `mix-blend-mode` effect.
- Goal: make header behavior visually match the working card/tag pattern.

## What we verified with runtime instrumentation

- Browser feature support was present:
  - `mix-blend-mode: difference` supported
  - `mix-blend-mode: plus-lighter` supported
  - `backdrop-filter` supported
- Computed styles often looked "correct" in header and tag:
  - header links had `mix-blend-mode: difference`
  - header backgrounds used blur and `plus-lighter`
- Under-header probe showed dynamic backgrounds below text (hero/section imagery), so blending had content to interact with.

## Hypotheses tested (high level)

1. **Feature support/fallback issue**
  Result: rejected by logs (support exists).
2. `**isolation` on header containers blocks effect**
  Result: partially plausible but not sufficient alone; removing/adding isolation did not consistently produce the desired visible result.
3. **Text node shape issue (link vs inner span)**
  Result: tested by moving blend onto inner spans; no visible improvement in user verification.
4. **Extra stacking contexts around header text**
  Result: confirmed by logs (header chain has multiple context creators: link/list/nav/header), unlike simpler working tag chain.
5. **Sticky header context as key factor**
  Result: strongly supported by runtime + user observation:
  - when header was switched from sticky to relative, blur and `mix-blend-mode` became visible
  - but this broke layout behavior (menu visibility/expected fixed behavior)

## Current code state (after pause cleanup)

- Debug instrumentation removed from `index.html` (all runtime POST logs and probe script deleted).
- Header remains in sticky mode in `styles/layout.css`:
  - `position: sticky`
  - `top: 0`
  - `z-index` currently not explicitly set in `.site-header` (left as `auto` in latest test state).
- Header component styles are back to baseline blend setup in `styles/components.css`:
  - links use `mix-blend-mode: difference`
  - header surfaces use backdrop blur + `plus-lighter`
  - `isolation: isolate` remains on header pills (`.site-header__nav`, `.site-header__contact`, `.site-header__mobile-trigger`).

## Where to continue next

- Primary unresolved tension:
  - preserve sticky header UX
  - keep visible blur + blend effect in header text
- Most promising direction for next iteration:
  - keep sticky behavior
  - isolate which sticky/stacking combination specifically suppresses the visual blend in this layout
  - test a structural split where sticky positioning lives on an outer wrapper, while blend surfaces/text are rendered in an inner non-sticky context.

## Resolution (2026-04-22)

### Root cause (verified via pixel sampling)

`mix-blend-mode: difference` on `.site-header__text` blends the text against the accumulated backdrop of the nearest ancestor stacking context. As long as `<header>` lives inside a stacking context that isolates it from the page (`position: fixed`, `position: sticky`, or `position: relative/absolute` with any non-auto `z-index`), Chromium promotes the header to its own compositing layer and the blend group no longer contains the page content — so white text stays white regardless of what scrolls beneath.

Secondary factor: `.site-header__text` was a `<span>` rendered as `display: inline`. Inline boxes fragment across line boxes, which Chromium does not reliably treat as a single blend root.

The old sticky → relative flip worked only because `position: relative` without a z-index is not a stacking context. But with header placed *before* `<main>` in the DOM, main's cyan hero background painted over the header area (CSS paint order empirically favored main's descendants over the positioned header without z-index).

### Fix (three coordinated changes)

1. **[styles/components.css](../styles/components.css)** — blend surface stays in a non-stacking context chain:
   - `.site-header__list`, `.nav-link.site-header__link/contact/mobile-trigger` — removed `position: relative; z-index: 1` (they were creating nested stacking contexts that isolated the span from the pill's `::before`).
   - `.site-header__text` — replaced inline with `display: inline-block; mix-blend-mode: difference;` (atomic blend box).
   - `@supports not (mix-blend-mode: plus-lighter)` fallback — corrected selector from the `.nav-link` anchors (which never had a blend mode) to `.site-header__text`.

2. **[styles/layout.css](../styles/layout.css)** — `.site-header` kept outside any stacking context:
   - `position: absolute; inset-block-start: 0; inset-inline: 0; padding-block: var(--space-600); pointer-events: none;`
   - No `z-index`. Relies on DOM paint order (see below) to stay visually on top.

3. **[index.html](../index.html)** — `<header class="site-header">` moved from *before* `<main>` to *after* `</footer>`. This keeps header out of main's paint layer while still rendering on top:
   - Document paint order now paints `<main>` and `<footer>` first, then the positioned `<header>`.
   - The blend root walks up from `.site-header__text` past nav/list/link/header (none of which form a stacking context) to `<body>` / root, so the span blends against the full page canvas.
   - Added an inline `<script>` that keeps the header pinned via `header.style.top = window.scrollY + "px"` inside a `requestAnimationFrame`-throttled scroll handler. Uses `top` (not `transform`) to avoid creating a stacking context.

### Why both levers are necessary

- Keeping `<header>` non-SC alone is insufficient: at `position: fixed/sticky` or with a `z-index`, Chromium isolates blending. Without any pinning mechanism, the header just scrolls with the page.
- JS-driven `top` pinning alone is insufficient: if any ancestor forces SC (e.g. `position: relative` with `z-index`), blending still fails.

Absolute positioning + `top: scrollY` via JS keeps the element visually at the viewport top while preserving a non-SC stacking chain.

### Verification

Pixel-level sampling via Playwright (`artifacts/debug/header-blend/clean-*.png`) across hero/schrift/mad/odds/curves/footer confirms difference-blend is applied (text glyphs sampled inside the About-link bounding box return the inverted color, not pure white):

| Section | Backdrop (sampled) | Text glyph (sampled) | Expected difference |
| --- | --- | --- | --- |
| Hero (cyan) | `[178, 217, 224]` | `[89, 35, 31]` | dark reddish brown |
| Schrift (light) | `[212, 214, 218]` | `[43, 41, 37]` | near-black |
| Odds & Ends (bark) | `[107, 26, 11]` | `[148, 229, 244]` | light cyan |
| Footer (dark teal) | `[0, 44, 42]` | `[255, 211, 213]` | peach |

- `smoke:visual` and `smoke:a11y` pass on Chromium.
- `smoke:token-semantic` fails only on the pre-existing `.hero__caption` / `.hero__description` letter-spacing drift noted in [artifacts/cross-browser-1512/final-verification-summary.md](cross-browser-1512/final-verification-summary.md). `.nav-link` typography still matches the token contract (American Grotesk 400 / 16 / 22 / 0.3px) — verified directly via computed style dump.
- `smoke:live` fails at viewport 390 on `heroOverlapArea` — this is a pre-existing mobile hero-layout issue where the 56px-line-height headline overlaps the profile photo. Unrelated to this fix (hero CSS untouched).

### Trade-offs / follow-ups

- DOM order: `<header>` now appears after `<main>` and `<footer>` in source. The landmark is still exposed via `<nav aria-label="Primary">`, and the skip-link still points at main, so screen-reader navigation remains usable, but tab order becomes `skip-link → main → footer → nav`. If that is a blocker, a CSS `order` reordering on a flex `<body>` is the cleanest fix and keeps DOM logical-first.
- Single-pointer scroll dependency: if JS fails to execute, the header falls back to scrolling with the page (it stays usable at the top of the document). Non-JS browsers retain the blend but lose pinning.
- Firefox and Safari manual pass pending — Chromium verified; cross-engine smoke relies on running the `firefox`/`webkit` projects after installing their browsers.