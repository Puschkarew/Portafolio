# Project sections — scroll-linked background & header art (spec, 2026-04-23)

## Product behavior (desktop, ≥ 1024px)

### Scope

Applies to the four work sections with `[data-project]`: `featured` (Schrift Collective), `madebymad`, `odds`, `curves`. Mobile/tablet: same layout as before — **no** scroll-driven crossfade; sections use their normal CSS surfaces and art (script exits early).

### What animates (scrubbable, scroll-only)

- **Page background** in the work area: solid per-project surface colors (crossfade by opacity between two layers).
- **Header artwork**: fixed, stacked, **opacity** crossfade (bitmap art for three sections; **Odds** uses the in-section WebGL shader; opacity driven the same way).
- **Text block in the project sticky header** (`.section-header__content`): **title, description, meta** — **RGB lerp** between the **“from”** and **“to”** project’s intended colors. Colors are sampled from pre-rendered **reference** elements (see implementation), never from `var(--foo)` strings.

**No** time-based `transition` on these driven properties; motion comes only from scroll position (optionally `prefers-reduced-motion` snaps `t`).

### Geometry (replaces old “last 25/50vh *before* next header at top”)

[artifacts/sticky-project-background-handoff.md](sticky-project-background-handoff.md) described a fade **ending** as the next header hit `top: 0`. This spec **replaces** that with:

1. A transition is defined by a pair **(from, to)**. **To** is always one of the four `data-project` values. **From** is either the **prelude** (page / above first project) or the previous `data-project` in DOM order.
2. When the **to** project’s `.section-header` **reaches the sticky state** (first time `|getBoundingClientRect().top| < ε` while scrolling in the natural forward direction, typically **ε ≈ 1.5px**), record `lockScrollY = window.scrollY` and set **`t = 0`**.
3. While the same header remains stuck and **t < 1**, increase **`t` linearly** with additional scroll:  
   `t = clamp01((scrollY - lockScrollY) / (0.5 * window.innerHeight))`  
   (window length **50vh** = **0.5 * inner height** in px).
4. **At `t = 0`** (immediately at lock, and also while **pre-lock**; see below): **all** of the three groups above (background, art, and text) match **from** (including text — same rule as the agreed Q&A: **strict** “all from previous” from the first pixel of the transition, pre-lock + lock start; **to** is scrubbed in over **50vh** with **interpolated** text in lock).

**Steady** after the window: `t = 1` for that handoff. While the same project stays stuck with `t = 1`, the visual is fully **to**.

**Pre-lock (before the to-header sticks)**: the **incoming** project section can already be in view, but the header is **not** yet at `top`. In that range, the visual is the same as **`t = 0`**: all parameters from **from** (e.g. on Made by Mad content before the header sticks, still **fully** from Schrift, including text colors, then scrub after stick).

**Prelude → featured**: the first project has no prior `data-project`. **From = prelude** = page-level surface and **reference** text tokens aligned with the default dark page (see [styles/layout.css](../styles/layout.css) for `.project-color-ref--prelude`).

### Art stack

- **Background**: single fixed **stage** under `main` (above a solid **base** token to avoid footer reveal bleed-through; see [AGENTS.md](../AGENTS.md)).
- **Art**: for bitmap sections, duplicate images in the stage **or** drive opacity on a shared asset; the active stack uses **only opacity** to blend. **Odds**: opacity on `.section--odds__shader` only; no bitmap in the stage.

### `data-header-theme` (global header)

[scripts/header-theme.js](../scripts/header-theme.js) still controls `html[data-header-theme]` on scroll. The project script runs **after** the header script in the same frame and sets the document theme to **from**’s `data-header-theme` when **`t < 0.5`**, and **to**’s when **`t ≥ 0.5`**, so the global header does not flip early. Do **not** change `.site-header` stacking; only the theme attribute is updated in line with the dominant segment.

### Accessibility

- **`prefers-reduced-motion: reduce`**: on entering a lock, set **`t = 1`** immediately (or keep visual at `t = 1` for the active pair) so there is no scrub.

### Differences from older worklogs

- [artifacts/sticky-backgrounds-worklog-2026-04-23.md](sticky-backgrounds-worklog-2026-04-23.md) and the **pre-stick** “split” text rule are **not** the source of truth for the **all-from-from + 50vh after stick** product decision captured here and in the 2026-04-23 Q&A.

## Implementation map

| Area | File(s) |
|------|---------|
| Stage + color refs in DOM | [index.html](../index.html) |
| Fixed stage, desktop-only transparent project sections | [styles/layout.css](../styles/layout.css) |
| Art opacity, no transition, section headers | [styles/components.css](../styles/components.css) |
| Scroll math, lerp, theme override | [scripts/project-sticky-background.js](../scripts/project-sticky-background.js) |

## Validation

- Local preview: [`.cursor/rules/local-preview-4173.mdc`](../.cursor/rules/local-preview-4173.mdc).
- `npm run smoke:structure` and `npm run smoke:visual` after HTML/CSS/JS changes.
