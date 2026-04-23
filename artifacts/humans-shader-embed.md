# Humans Shader Embed

Use `dist/humans-shader-embed.js` when embedding the WebGL animation into another static site without the demo page controls.

## Files To Deploy

Copy these files to the portfolio site:

```text
/assets/humans-shader/humans-shader-embed.js
/assets/humans-shader/orange-gradient.jpg
/assets/humans-shader/blue-noise.png
```

The image files are the existing assets from this repository's `assets/` directory. The script file is `dist/humans-shader-embed.js`.

## Minimal Usage

```html
<div id="humans-shader" class="humans-shader-slot"></div>

<script src="/assets/humans-shader/humans-shader-embed.js"></script>
<script>
  window.initHumansShader(document.getElementById("humans-shader"), {
    assetBaseUrl: "/assets/humans-shader/"
  });
</script>
```

The root element must have an explicit rendered size. The canvas fills the root with `width: 100%` and `height: 100%`.

```css
.humans-shader-slot {
  width: 100%;
  height: 100vh;
}
```

For a section embed, use the section height you want:

```css
.hero-visual {
  width: 100%;
  min-height: 520px;
}
```

## API

```js
const instance = window.initHumansShader(rootElement, {
  showPanel: false,
  persistConfig: false,
  assetBaseUrl: "/assets/humans-shader/"
});
```

Options:

- `showPanel`: default `false`. When `false`, no control panel DOM is created.
- `persistConfig`: default `false`. When `false`, the embed does not call `localStorage`.
- `assetBaseUrl`: default `"assets/"`. Used for `orange-gradient.jpg` and `blue-noise.png`; both with and without a trailing slash are accepted.

Return value:

```js
instance.canvas;
instance.resize();
instance.destroy();
```

Call `destroy()` before removing the root from the DOM in single-page apps or page-transition systems.

## Optional Debug Panel

Use this only for tuning:

```js
window.initHumansShader(document.getElementById("humans-shader"), {
  showPanel: true,
  persistConfig: true,
  assetBaseUrl: "/assets/humans-shader/"
});
```

With `persistConfig: true`, settings are saved under `humans-shader-embed-controls-v1`.

## Notes

- The embed requires WebGL2.
- Resize is based on the root element, not the browser window.
- Pointer interaction is normalized from the canvas bounds.
- The current `index.html` demo is separate and does not need to be changed for portfolio usage.
