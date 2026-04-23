/**
 * Builds assets/humans-shader/humans-shader-embed.js from .tmp-humans-shader/index.html
 * Run: node scripts/build-humans-shader-embed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcHtml = path.join(root, ".tmp-humans-shader", "index.html");
const outJs = path.join(root, "assets", "humans-shader", "humans-shader-embed.js");

if (!fs.existsSync(srcHtml)) {
  console.error("Missing", srcHtml, "— run: git clone --depth 1 https://github.com/Puschkarew/humans-shader.git .tmp-humans-shader");
  process.exit(1);
}

const html = fs.readFileSync(srcHtml, "utf8");
const startMark = "<script>\n      (() => {";
const start = html.indexOf(startMark);
const end = html.indexOf("})();\n    </script>", start);
if (start === -1 || end === -1) {
  console.error("Script block boundaries not found");
  process.exit(1);
}
let body = html.slice(start + startMark.length, end);

// --- patches ---
body = body.replace(
  /const STORAGE_KEY = "[^"]+";/,
  'const STORAGE_KEY = persistConfig ? "humans-shader-embed-controls-v1" : "__humansShaderNoPersist__";'
);

body = body.replace(
  /function loadConfig\(\) \{\s*const config = cloneDefaults\(\);/,
  `function loadConfig() {
          const config = cloneDefaults();
          if (STORAGE_KEY === "__humansShaderNoPersist__") {
            return config;
          }`
);

body = body.replace(
  /function saveConfig\(\) \{\s*try \{/,
  `function saveConfig() {
          if (STORAGE_KEY === "__humansShaderNoPersist__") {
            return;
          }
          try {`
);

body = body.replace(
  /const canvas = document\.getElementById\("gl"\);/,
  "// canvas created by initHumansShader"
);

body = body.replace(
  /if \(!gl\) \{\s*console\.warn\("WebGL2 not supported"\);\s*return;\s*\}/,
  `if (!gl) {
          console.warn("WebGL2 not supported");
          return {
            canvas: canvas,
            resize: function () {},
            destroy: function () {
              if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
              }
            }
          };
        }`
);

body = body.replace(
  /function resize\(\) \{\s*const dpr = getCurrentDpr\(\);\s*screenWidth = Math\.max\(1, Math\.floor\(window\.innerWidth \* dpr\)\);\s*screenHeight = Math\.max\(1, Math\.floor\(window\.innerHeight \* dpr\)\);/,
  `function resize() {
          const dpr = getCurrentDpr();
          const rect = rootElement.getBoundingClientRect();
          const cssW = Math.max(1, rect.width);
          const cssH = Math.max(1, rect.height);
          screenWidth = Math.max(1, Math.floor(cssW * dpr));
          screenHeight = Math.max(1, Math.floor(cssH * dpr));`
);

body = body.replace(
  /function updatePointer\(event\) \{\s*const x = event\.clientX \/ window\.innerWidth;\s*const y = 1 - event\.clientY \/ window\.innerHeight;/,
  `function updatePointer(event) {
          const rect = canvas.getBoundingClientRect();
          const rw = Math.max(1, rect.width);
          const rh = Math.max(1, rect.height);
          const x = (event.clientX - rect.left) / rw;
          const y = 1 - (event.clientY - rect.top) / rh;`
);

body = body.replace(/loadImage\("assets\/orange-gradient\.jpg"/g, 'loadImage(ASSET_BASE + "orange-gradient.jpg"');
body = body.replace(/loadImage\("assets\/blue-noise\.png"/g, 'loadImage(ASSET_BASE + "blue-noise.png"');

body = body.replace(
  /const statFps = document\.getElementById\("statFps"\);\s*const statFrame = document\.getElementById\("statFrame"\);\s*const statRender = document\.getElementById\("statRender"\);\s*const statPixels = document\.getElementById\("statPixels"\);\s*const statResScale = document\.getElementById\("statResScale"\);\s*const statDpr = document\.getElementById\("statDpr"\);\s*const statPasses = document\.getElementById\("statPasses"\);/,
  `const statFps = showPanel ? document.getElementById("statFps") : null;
        const statFrame = showPanel ? document.getElementById("statFrame") : null;
        const statRender = showPanel ? document.getElementById("statRender") : null;
        const statPixels = showPanel ? document.getElementById("statPixels") : null;
        const statResScale = showPanel ? document.getElementById("statResScale") : null;
        const statDpr = showPanel ? document.getElementById("statDpr") : null;
        const statPasses = showPanel ? document.getElementById("statPasses") : null;`
);

body = body.replace(
  /function updateResourceStats\(\) \{\s*statRender\.textContent/,
  `function updateResourceStats() {
          if (!showPanel) {
            return;
          }
          statRender.textContent`
);

body = body.replace(
  /function updateFpsStats\(delta, now\) \{\s*statsFrames \+= 1;/,
  `function updateFpsStats(delta, now) {
          if (!showPanel) {
            return;
          }
          statsFrames += 1;`
);

body = body.replace(
  /const controlsRoot = document\.getElementById\("controlSections"\);\s*const panel = document\.getElementById\("controlPanel"\);\s*const panelToggle = document\.getElementById\("panelToggle"\);\s*const resetButton = document\.getElementById\("resetControls"\);/,
  `const controlsRoot = showPanel ? document.getElementById("controlSections") : null;
        const panel = showPanel ? document.getElementById("controlPanel") : null;
        const panelToggle = showPanel ? document.getElementById("panelToggle") : null;
        const resetButton = showPanel ? document.getElementById("resetControls") : null;`
);

body = body.replace(
  /window\.addEventListener\("resize", \(\) => \{\s*resize\(\);\s*updateResourceStats\(\);\s*renderOnce\(\);\s*\}\);/,
  `const onWindowResize = () => {
          resize();
          updateResourceStats();
          renderOnce();
        };
        window.addEventListener("resize", onWindowResize);
        const resizeObserver = new ResizeObserver(() => {
          onWindowResize();
        });
        resizeObserver.observe(rootElement);`
);

body = body.replace(
  /panelToggle\.addEventListener\("click", \(\) => \{\s*panel\.classList\.toggle\("collapsed"\);\s*panelToggle\.textContent = panel\.classList\.contains\("collapsed"\) \? "Show" : "Hide";\s*\}\);\s*resetButton\.addEventListener\("click", resetConfig\);/,
  `if (showPanel && panelToggle && panel) {
        panelToggle.addEventListener("click", () => {
          panel.classList.toggle("collapsed");
          panelToggle.textContent = panel.classList.contains("collapsed") ? "Show" : "Hide";
        });
        }
        if (showPanel && resetButton) {
        resetButton.addEventListener("click", resetConfig);
        }`
);

body = body.replace(
  /resize\(\);\s*buildControls\(\);\s*syncControls\(\);\s*updateResourceStats\(\);\s*renderOnce\(\);\s*start\(\);/,
  `resize();
        if (showPanel) {
        buildControls();
        syncControls();
        }
        updateResourceStats();
        renderOnce();
        start();

        return {
          canvas: canvas,
          resize: onWindowResize,
          destroy: function () {
            stop();
            if (typeof resizeObserver !== "undefined" && resizeObserver) {
              resizeObserver.disconnect();
            }
            window.removeEventListener("resize", onWindowResize);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (mediaQuery.removeEventListener) {
              mediaQuery.removeEventListener("change", handleMotionChange);
            } else if (mediaQuery.removeListener) {
              mediaQuery.removeListener(handleMotionChange);
            }
            if (gl) {
              const lose = gl.getExtension("WEBGL_lose_context");
              if (lose) {
                try {
                  lose.loseContext();
                } catch (e) {}
              }
            }
            if (canvas && canvas.parentNode) {
              canvas.parentNode.removeChild(canvas);
            }
          }
        };`
);

// Note: showPanel false means no control DOM — embed must not run when panel is false without DOM.
// The index.html has panel in body; portfolio won't include panel HTML. buildControls is skipped,
// so we're good. Stat IDs missing — we guard with !showPanel.

const preamble = `/**
 * humans-shader embed — generated by scripts/build-humans-shader-embed.mjs
 * Exposes: window.initHumansShader(rootElement, options)
 */
(function () {
  "use strict";

  function normalizeAssetBase(url) {
    if (!url || typeof url !== "string") {
      return "assets/";
    }
    return url.endsWith("/") ? url : url + "/";
  }

  window.initHumansShader = function initHumansShader(rootElement, options) {
    if (!rootElement || rootElement.nodeType !== 1) {
      return null;
    }
    options = options || {};
    const showPanel = options.showPanel === true;
    const persistConfig = options.persistConfig === true;
    const ASSET_BASE = normalizeAssetBase(options.assetBaseUrl);
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { display: "block", width: "100%", height: "100%", verticalAlign: "top" });
    rootElement.appendChild(canvas);

`;

const closing = `  };
})();`;

if (!fs.existsSync(path.dirname(outJs))) {
  fs.mkdirSync(path.dirname(outJs), { recursive: true });
}
fs.writeFileSync(outJs, preamble + "\n" + body + "\n" + closing);
console.log("Wrote", outJs);
