# Safari manual checklist (1512)

## Goal
- Confirm visual parity intent for header/menu/button blur and blend on Safari at `1512x900`.

## Preconditions
- Open `http://127.0.0.1:4173/` in Safari.
- Use viewport `1512x900`.
- Hard refresh before checks.

## Required checks
- Header is pinned while scrolling.
- Header menu pill has visible blur over background content.
- Header text is readable and reacts as `difference`-style contrast over light/dark areas.
- Header CTA (`Get in touch`) matches menu pill behavior (same blur/blend intent).
- Card tag buttons (for example `Schrift Foundry`) still have visible blur and readable text.
- No severe cross-engine mismatch versus Chromium baseline.

## Evidence to capture
- `safari-home-1512.png` (top of page with header + CTA visible).
- `safari-cards-1512.png` (scrolled to first cards where tag + header are both visible).
- Optional: `safari-cta-closeup-1512.png` if CTA rendering differs from header menu text.

## Current reference evidence
- User-provided Safari screenshots:
  - `assets/CleanShot_2026-04-22_at_10.17.30_2x-98e379c3-f964-4ca6-814b-0f88fee50b9a.png`
  - `assets/CleanShot_2026-04-22_at_10.18.05_2x-79feae2c-4d89-4f1f-b827-2e9c3517e1b7.png`
- Playwright WebKit captures:
  - `artifacts/cross-browser-1512/post-fix/webkit-home-1512.png`
  - `artifacts/cross-browser-1512/post-fix/webkit-cardsB-1512.png`

## iPhone Safari (bottom chrome / project backgrounds)

- Open the same local URL on a real device.
- Scroll through **Featured Stories** and project sections with sticky background scrub.
- While the **bottom** Safari bar (tabs / address) **collapses and expands**, confirm there is **no** empty strip at the lower edge (no “see-through” to the footer or wrong layer).
- Optionally capture a short screen recording if anything regresses.
