# Header glass + blend implementation handoff

Документ описывает финальную рабочую схему шапки из тестовой копии проекта. Его можно передать агенту в оригинальном проекте как точную спецификацию миграции.

## Цель

Сделать шапку, которая:

- визуально всегда находится выше всего контента, включая sticky section headers, огромные заголовки, canvas/WebGL и арт-слои;
- сохраняет настоящий `mix-blend-mode: difference` на тексте;
- сохраняет настоящий `backdrop-filter` blur на стеклянных плашках;
- не дергает видимый текст при скролле;
- не двигает blur-плашки через `top = scrollY`;
- оставляет ссылки кликабельными поверх всего контента.

## Ключевая архитектура

Шапка теперь состоит из четырех независимых ответственностей.

1. **Glass layer**
   - Отдельный fixed-слой `.site-header-glass`.
   - В нем три пустые плашки: `nav`, `contact`, `mobile`.
   - Только этот слой содержит `backdrop-filter`.
   - Этот слой поднят через `z-index`.

2. **Source header**
   - Настоящий `<header class="site-header">` остается после `main` и `footer` в DOM.
   - Он остается `position: absolute` и `z-index: auto`.
   - На `.site-header` нельзя ставить высокий `z-index`: в Chromium это снова ломает `mix-blend-mode`.
   - Внутри остаются настоящие `nav`, ссылки и исходный текст. Они используются как source geometry и fallback.

3. **Visible text layer**
   - JS создает fixed-клоны `.site-header__visual-text` для каждого `.site-header__text`.
   - Эти клоны являются единственным видимым текстом после JS-инициализации.
   - Они получают `position: fixed`, высокий `z-index`, `mix-blend-mode: difference`, `pointer-events: none`.
   - Так текст не зависит от scroll-compensated rail и не дергается.

4. **Hitbox layer**
   - JS создает transparent fixed-клоны ссылок `.site-header__hit-link`.
   - Они находятся выше visible text и glass через `z-index`.
   - Они пустые, `aria-hidden="true"`, `tabindex="-1"`, но с тем же `href`, что у настоящих ссылок.
   - Это решает кликабельность поверх canvas/sticky/арт-слоев, не влияя на визуальный blend.

## DOM changes

Внутри `.site-shell`, после `</footer>` и перед `<header class="site-header">`, добавить glass sibling:

```html
<div class="site-header-glass" aria-hidden="true">
  <div class="site-header-glass__item" data-header-glass-item="nav"></div>
  <div class="site-header-glass__item" data-header-glass-item="contact"></div>
  <div class="site-header-glass__item" data-header-glass-item="mobile"></div>
</div>

<header class="site-header">
  ...
</header>
```

Настоящий header должен остаться после footer. Ссылки и структура nav/contact/mobile не меняются.

## Token changes

Добавить отдельные layer-токены. В тестовой копии они добавлены рядом с существующими layer-токенами:

```css
--layer-header-glass: 2147483000;
--layer-header-text: 2147483001;
--layer-header-hit: 2147483002;
```

Важно: эти токены применяются только к fixed glass/text/hitbox слоям. Не применять их к `.site-header`.

## CSS changes

### Keep source header blend-safe

`.site-header` должен оставаться таким:

```css
.site-header {
  position: absolute;
  top: 0;
  inset-inline: 0;
  padding-block: var(--space-600);
  pointer-events: none;
}

.site-header__pin,
.site-header__grid,
.site-header__menu,
.site-header__list {
  pointer-events: none;
}
```

Не добавлять на `.site-header`:

- `z-index`;
- `position: fixed`;
- `position: sticky`;
- `transform`;
- `contain`;
- `will-change`;
- `isolation`;
- `opacity < 1`.

### Move blur out of source nav

Удалить blur/background pseudo-elements с:

- `.site-header__nav::before`;
- `.site-header__contact::before`;
- `.site-header__mobile-trigger::before`.

Эти элементы должны стать прозрачными geometry/text containers:

```css
.site-header__nav,
.site-header__contact,
.site-header__mobile-trigger {
  position: relative;
  border-radius: var(--radius-sm);
  background: transparent;
  overflow: visible;
}
```

Ссылки внутри source header остаются pointer-enabled:

```css
.nav-link.site-header__link,
.nav-link.site-header__contact,
.nav-link.site-header__mobile-trigger {
  color: var(--header-fg);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 0;
  pointer-events: auto;
}
```

### Add fixed glass layer

```css
.site-header-glass {
  position: fixed;
  inset: 0;
  z-index: var(--layer-header-glass);
  pointer-events: none;
}

.site-header-glass__item {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: 0;
  display: none;
  inline-size: 0;
  block-size: 0;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--header-overlay-bg);
  backdrop-filter: blur(var(--header-overlay-blur));
  -webkit-backdrop-filter: blur(var(--header-overlay-blur));
  z-index: var(--layer-header-glass);
  pointer-events: none;
}
```

Fallback for no backdrop support should point to `.site-header-glass__item`, not the removed `::before` pseudos:

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .site-header-glass__item,
  .tag::before {
    background: rgba(0, 0, 0, 0.44);
  }
}
```

### Add visible fixed text layer

Source text remains the fallback:

```css
.site-header__text {
  display: inline-block;
  color: var(--color-white);
  mix-blend-mode: difference;
}
```

After JS creates visible clones, source text becomes transparent:

```css
.has-header-visual-text .site-header__text {
  color: transparent;
  mix-blend-mode: normal;
}
```

Visible clones:

```css
.site-header__visual-text-layer {
  pointer-events: none;
}

.site-header__visual-text {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: 0;
  display: none;
  font-family: var(--type-caption-family);
  font-weight: var(--type-caption-weight);
  font-size: var(--type-caption-size);
  line-height: var(--type-caption-line-height);
  letter-spacing: var(--type-caption-tracking);
  color: var(--color-white);
  white-space: nowrap;
  mix-blend-mode: difference;
  z-index: var(--layer-header-text);
  pointer-events: none;
}
```

### Add transparent fixed hitbox layer

```css
.site-header__hit-layer {
  pointer-events: none;
}

.site-header__hit-link {
  position: fixed;
  inset-block-start: 0;
  inset-inline-start: 0;
  display: none;
  overflow: hidden;
  color: transparent;
  text-decoration: none;
  white-space: nowrap;
  z-index: var(--layer-header-hit);
  pointer-events: auto;
  cursor: pointer;
}
```

## JS changes

Replace the old spring/smoothDamp behavior with exact source rail positioning plus fixed overlay geometry sync.

### Keep these constants

```js
var HEADER_SELECTOR = ".site-header";
var MOVING_RAIL_SELECTOR = ".site-header__menu";
var THEME_SELECTOR = "[data-header-theme]:not(html)";
var GLASS_SOURCES = [
  { name: "nav", selector: ".site-header__nav" },
  { name: "contact", selector: ".site-header__contact" },
  { name: "mobile", selector: ".site-header__mobile-trigger" }
];
```

### Runtime responsibilities

The runtime must do all of the following:

- Cache `.site-header`, `.site-header__menu`, glass items, theme nodes.
- Create `.site-header__visual-text-layer` inside `.site-header`.
- For every `.site-header__text`, create one `.site-header__visual-text` clone with the same text content.
- Create `.site-header__hit-layer` inside `.site-header`.
- For every real link `.site-header__link`, `.site-header__contact`, `.site-header__mobile-trigger`, create one `.site-header__hit-link` clone:
  - same `href`;
  - `aria-hidden="true"`;
  - `tabIndex = -1`.
- Write exact source rail pinning:
  - `.site-header__menu.style.top = quantizedScrollY + "px"`.
- Sync glass item rects from the real source elements:
  - source `.site-header__nav` to `[data-header-glass-item="nav"]`;
  - source `.site-header__contact` to `[data-header-glass-item="contact"]`;
  - source `.site-header__mobile-trigger` to `[data-header-glass-item="mobile"]`.
- Sync visible text clone rects from source `.site-header__text` rects.
- Sync hit link rects from source link rects.
- Hide glass/text/hit clones when source elements are hidden or have zero rect.
- Toggle `.has-header-visual-text` on `<html>` after visual text clones exist.
- Keep theme sampling based on the visible source rail rect.

### Scroll behavior

The scroll handler should update source rail `top` synchronously, not only in the next rAF:

```js
function onScroll() {
  if (pinRaf) {
    cancelAnimationFrame(pinRaf);
    pinRaf = 0;
  }

  pinHeader();
}
```

`pinHeader()` only needs to write exact top and schedule theme sampling:

```js
function pinHeader() {
  writeTop(currentScrollTop());
  themeDirty = true;
  scheduleThemeFrame();
}
```

Do not run `syncGlassGeometry()`, `syncVisualTextGeometry()`, or `syncHitGeometry()` on every scroll. Those fixed overlay rects do not need per-scroll updates once the source rail is pinned.

### Geometry updates

Run geometry sync on:

- init;
- resize;
- `document.fonts.ready`;
- `ResizeObserver` changes for header/menu/source elements;
- explicit debug API `syncGeometry()`.

The geometry sync functions should use `getBoundingClientRect()` and write fixed `left`, `top`, `inlineSize`, `blockSize` in quantized CSS pixels.

### Debug API

Keep a small API if useful:

```js
window.__portfolioHeaderMotion = {
  getParams: function () {
    return {
      mode: "exact",
      appliedTop: appliedTop,
      topStep: topStep
    };
  },
  setParams: function () {
    refreshLayout();
    return this.getParams();
  },
  resetParams: function () {
    return this.setParams({});
  },
  syncGeometry: function () {
    scheduleGlassFrame();
    return this.getParams();
  }
};
```

## Critical gotchas

- Do not put high `z-index` on `.site-header`. Tested result: visible text becomes white on light backgrounds because Chromium isolates the blend group.
- Do not make `.site-header` `position: fixed` or `sticky`. Same issue: `mix-blend-mode: difference` breaks in Chromium.
- Do not move blur back into `.site-header__nav::before` or the moving rail. That reintroduces the original blur/motion cost.
- Do not make fixed anchors the visible blend text. Tested result: fixed anchor ancestor breaks `difference`. The working model is fixed visible `span` clones, not fixed link text.
- The fixed hitbox links must be visually empty and transparent. They are only for pointer hit testing.
- The original source links remain in DOM for semantics and keyboard/fallback behavior.

## Validation checklist

Run these checks after migration.

### Runtime invariants in Chromium

After scrolling to `1200` on a `1512x900` viewport:

- `.site-header`:
  - `position: absolute`;
  - `z-index: auto`.
- `.site-header-glass__item`:
  - `position: fixed`;
  - `z-index: var(--layer-header-glass)`.
- `.site-header__visual-text`:
  - `position: fixed`;
  - `mix-blend-mode: difference`;
  - `z-index: var(--layer-header-text)`.
- `.site-header__hit-link`:
  - `position: fixed`;
  - `z-index: var(--layer-header-hit)`.
- `elementFromPoint()` over the visible About label should return `.site-header__hit-link`, with href ending in `#about`.
- Pixel sampling on the About label over a light section should include dark glyph pixels, not all-white pixels.

### Visual checks

- At the top hero, huge hero headline must never cover nav text.
- On the Odds/WebGL/canvas section, canvas must never cover the glass or text.
- On mobile, only `Vladimir Pushkarev` and `Menu` visible text/hitboxes should be shown; hidden desktop links should have zero/none clone rects.
- Text should not jitter during scroll.
- Glass should stay fixed and aligned under the visible header.

### Existing commands used in the test copy

```bash
npm run smoke:structure
npm run smoke:visual
```

In the test copy, both passed after this implementation. Known unrelated failures still existed before this work:

- `npm run lint:quality` fails because the test copy has no Stylelint config.
- `npm run lint:html` fails on pre-existing doctype/void-element style rules.
- `npm run smoke:a11y` fails on pre-existing horizontal overflow from section/footer artwork, not from the header.

## Files changed in the test copy

- `index.html`
  - Added `.site-header-glass` before `.site-header`.
- `styles/tokens.css`
  - Added header overlay layer tokens.
- `styles/layout.css`
  - Kept `.site-header` absolute and made `.site-header__pin` pointer-neutral.
- `styles/components.css`
  - Moved blur to `.site-header-glass__item`.
  - Added fixed visual text clone styles.
  - Added fixed transparent hitbox clone styles.
  - Removed header nav/contact/mobile blur pseudo responsibility.
- `scripts/header-theme.js`
  - Replaced spring-based visible motion with exact source rail pinning.
  - Added glass geometry sync.
  - Added visible text clone creation/sync.
  - Added transparent hitbox clone creation/sync.

