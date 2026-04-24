# Header Theme Removal Handoff

## Problem

The header glass background used to change when the page reached `Odds & Ends`. The visible symptom was that the nav/contact pills became dark on that section instead of keeping the same transparent glass style used elsewhere.

Root cause:

- `index.html` marked sections with `data-header-theme`.
- `Odds & Ends` had `data-header-theme="light"`.
- `scripts/header-theme.js` and `scripts/project-sticky-background.js` could write `data-header-theme` onto `<html>`.
- `styles/tokens.css` had `:root[data-header-theme="light"]` overriding `--header-overlay-bg` to `rgba(0, 0, 0, 0.42)`.
- `.site-header-glass__item` uses `background: var(--header-overlay-bg)`, so the header pills visibly changed when the global theme flipped.

The required behavior is: the header has no themes. It always uses one transparent glass style with blur. Do not change the frozen header stacking architecture.

## Implementation Steps

1. Remove all header theme attributes from `index.html`.
   - `<html lang="en" data-header-theme="dark">` becomes `<html lang="en">`.
   - Remove `data-header-theme` from hero, work, project sections, and footer.
   - Keep `data-project` on project sections.
   - Add cache-busting query strings to the two JS files that previously wrote theme state:
     - `scripts/header-theme.js?v=no-header-themes`
     - `scripts/project-sticky-background.js?v=no-header-themes`

2. Freeze header CSS tokens in `styles/tokens.css`.
   - Keep:
     - `--header-overlay-bg: var(--color-tag-overlay);`
     - `--header-overlay-blur: 48px;`
   - Remove `--header-fg`.
   - Remove both theme blocks:
     - `:root[data-header-theme="light"]`
     - `:root[data-header-theme="dark"]`

3. Remove dynamic header foreground usage in `styles/components.css`.
   - Replace `color: var(--header-fg);` with `color: var(--color-text-primary);` for source/fallback header links.
   - In `@supports not (mix-blend-mode: difference)`, use `color: var(--color-text-primary);`.
   - Do not change `.site-header__visual-text`: it must stay `color: var(--color-white)` with `mix-blend-mode: difference`.
   - Do not change `.site-header`, `.site-header-glass`, visual text clone, or hitbox stacking rules.

4. Remove theme runtime from `scripts/header-theme.js`.
   - Delete constants/state used only for themes:
     - `THEME_SELECTOR`
     - `VALID`
     - `DEFAULT_HEADER_HEIGHT`
     - `themeNodes`
     - `observer`
     - `themeRaf`
     - `headerHeight`
     - `themeDirty`
   - Delete theme-only functions:
     - `cacheThemeNodes`
     - `measureHeader`
     - `samplePoint`
     - `pickTheme`
     - `applyTheme`
     - `runThemeFrame`
     - `scheduleThemeFrame`
     - `attachObserver`
   - Make `pinHeader()` only call `writeTop(currentScrollTop())`.
   - Remove theme calls from `refreshLayout()` and `init()`.
   - Keep all pinning, glass geometry sync, visual text clone creation, hitbox clone creation, resize observer, and `window.__portfolioHeaderMotion`.

5. Remove project-driven theme writes from `scripts/project-sticky-background.js`.
   - Delete `headerThemeFor`.
   - Delete `applyDocumentTheme`.
   - Remove the `applyDocumentTheme(pair)` call inside `compute()`.
   - Leave project background opacity, art blur, text color interpolation, reduced motion, and footer detach behavior unchanged.

6. Update `tests/smoke/home.project-transitions.spec.ts`.
   - Replace the snapshot field `theme: string | null` with `hasHeaderTheme: boolean`.
   - Return `document.documentElement.hasAttribute("data-header-theme")`.
   - Assert `hasHeaderTheme === false` at:
     - the first `madebymad` pre-sticky snapshot,
     - `oddsBeforeSticky`,
     - `oddsMidTransition`.
   - Remove old expectations for `"dark"` and `"light"`.

7. Update docs and handoff notes that described the old contract.
   - State that `data-header-theme` is no longer part of the runtime.
   - State that project sticky transitions must not update header theme.
   - Keep the warning that `.site-header` stacking is frozen.

## Validation

Run these commands from the project root:

```sh
npm run smoke:structure
npm run smoke:projects
npm run smoke:visual
```

Expected result: all three pass.

Then verify in the in-app browser with `@browser-use`:

1. Start or reuse a local server on `http://127.0.0.1:4174/`.
2. Open a fresh URL such as `http://127.0.0.1:4174/?verify=<timestamp>`.
3. Check:

```js
document.querySelectorAll("[data-header-theme]").length === 0
document.documentElement.getAttribute("data-header-theme") === null
```

4. Scroll through:
   - hero,
   - `Made by Mad`,
   - `Odds & Ends`,
   - footer.
5. At each stop, confirm:
   - no `[data-header-theme]` exists,
   - `html[data-header-theme]` is absent,
   - `.site-header-glass__item[data-header-glass-item="nav"]` and contact retain the same transparent glass style and do not switch to the old dark overlay.
6. Capture a screenshot at `Odds & Ends` as visual proof.

Browser cache note:

- If the in-app browser still reports `htmlTheme: "dark"` after the code change, it is using cached old JS.
- The script query strings in `index.html` are intentional. They force the browser to fetch the updated `scripts/header-theme.js` and `scripts/project-sticky-background.js`.
- After that, re-open `http://127.0.0.1:4174/?verify=<timestamp>` and repeat the checks.

## Do Not Change

- Do not make `.site-header` fixed or sticky.
- Do not add `z-index`, `transform`, `isolation`, `contain`, or opacity changes to `.site-header`.
- Do not move blur back into the moving source header.
- Do not remove fixed glass, visual text clones, or transparent hitbox links.
- Do not reintroduce `data-header-theme` on any section, footer, or `<html>`.
