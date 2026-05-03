# Top 2019 Hero Illustration Handoff

This documents the Top 2019 cover animation prototype in `top2019-hero-playground.html` and its case-page implementation in `src/top-2019.njk`, `styles/components.css`, and `scripts/top-2019-hero.js`.

## Source Assets

Keep the source files in `assets/figma/Top2019/`.

- `hero-strip.jpg`: original long vertical numeral strip from the Readymag site, `1217 x 16020`.
- `Logo w.svg`: original 36 x 36 Schrift logo.
- `hero.mp4`: timing reference only; do not use it as the production hero implementation.

## Scene Geometry

The animation uses the Readymag coordinate system from the original first screen:

- virtual stage: `1024 x 672`;
- stage scale: `max(viewportWidth / 1024, viewportHeight / 672)`;
- strip width on the virtual stage: `300px`;
- strip x-position on the virtual stage: `362px`;
- logo position on the virtual stage: `28px 29px`;
- logo size on the virtual stage: `36px`.

Use `transform: translate(-50%, -50%) scale(var(--stage-scale))` on the virtual stage so the crop matches the original composition across viewport sizes.

## Motion

The strip is one image moving in one continuous vertical transform. Do not split the movement into multiple keyframe stops.

- start transform: `translateY(148px)`;
- end transform: `translateY(-3415px)` (Readymag reference was `-3439px`; end value moved `24px` toward `0` so the final `7` sits slightly lower for optical vertical centering);
- total reference length: `2535ms`;
- strip appearance: `940ms`, `opacity 0 -> 1` and `blur(22px) -> 0`;
- movement delay: `1150ms`;
- movement duration: `1385ms`;
- movement easing: `cubic-bezier(0.88, 0, 0.12, 1)`.

The intended feel is: the `1` appears on black, remains centered with no `2` visible, starts very slowly, accelerates hard through the middle, then slows into the final `7`.

Measured checkpoints from the current prototype:

- `1000ms`: `translateY(148px)`;
- `1250ms`: about `translateY(137px)`;
- `1500ms`: about `translateY(-3px)`;
- `1750ms`: about `translateY(-606px)`;
- `2000ms`: about `translateY(-2970px)`;
- `2250ms`: about `translateY(-3355px)`;
- `2535ms`: `translateY(-3415px)`.

## Integration Notes

- The case page places this inside the existing case hero media slot; do not change frozen header or footer code for this animation.
- In the case implementation, `.top2019-logo` is a sibling of `.top2019-stage`, not a child. This keeps the logo anchored to the black hero viewport instead of being cropped by the oversized stage.
- `scripts/top-2019-hero.js` adds `.is-ready` only after the strip image and `window.load` are ready, so the CSS animation does not finish before the hero is visible.
- Use relative asset URLs when testing the standalone playground, but root-relative URLs are fine inside Eleventy templates.
- For `prefers-reduced-motion: reduce`, skip both animations and show the final `7` frame with the logo fully visible.
- Keep the debug replay/pause/scrubber controls out of the default hero view; they are only for tuning.

## Validation

- Verify the initial frame shows only the centered `1`; the `2` must not be visible.
- Verify the final frame matches the original first-screen `7` composition.
- Check `1440 x 900` and a wide desktop viewport before moving this into a case hero.
- Run `npx html-validate top2019-hero-playground.html` after edits to the standalone prototype.
