const SQRT3_OVER_2 = Math.sqrt(3) / 2;
const HEX_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const NOMINAL_WORLD_SCALE = 0.62;
const LUT_SAMPLES = 1024;
const COVERAGE_MARGIN = 120;
const RELAX_ZONE_MULTIPLIER = 1.35;
const RELAX_FACTOR = 0.82;
const STOP_EPSILON = 0.02;
const MAX_POINTER_SPEED = 90;
const RELAX_PASSES = 2;
const MAX_CUSTOM_ICONS = 256;
const MAX_ICON_FILE_BYTES = 262144;
const ICON_STORAGE_KEY = "watch-grid-custom-icons-v1";
const ICON_STORAGE_VERSION = 1;
const ICON_DRAW_DIAMETER_RATIO = 0.82;
const COLOR_SETTINGS_STORAGE_KEY = "watch-grid-color-settings-v1";
const COLOR_SETTINGS_VERSION = 1;
const FAR_SHRINK_TRANSITION_PX = 60;
const MIN_VISIBLE_RADIUS_PX = 2.6;
const INERTIA_EFFECTIVE_MAX = 0.999;

const LIMITS = Object.freeze({
  bubbleSize: { min: 40, max: 184 },
  peripheralScale: { min: 0.12, max: 1.1 },
  centerScale: { min: 0.95, max: 3.6 },
  focusRadius: { min: 140, max: 840 },
  farFadeStartRatio: { min: 0.2, max: 1.2 },
  gapPx: { min: 1, max: 100 },
  follow: { min: 0.08, max: 0.9 },
  inertia: { min: 0.82, max: 1.96 },
});

const DEFAULT_SETTINGS = Object.freeze({
  bubbleSize: 138,
  peripheralScale: 0.39,
  centerScale: 1.18,
  focusRadius: 216,
  farFadeStartRatio: 1.2,
  gapPx: 100,
  follow: 0.08,
  inertia: 1.13,
});

const DEFAULT_COLORS = Object.freeze({
  sceneBackground: "#00693F",
  circleColor: "#FFD53D",
  iconTint: "#FFD53D",
});

const ICONS_BASE = "./icons/";
const ICONS_MANIFEST_URL = "./icons/manifest.json";

function isEmbedMode() {
  return typeof document !== "undefined" && Boolean(document.body?.classList.contains("embed"));
}

const refs = {
  scene: document.getElementById("scene"),
  canvas: document.getElementById("gridCanvas"),
  visibleCount: document.getElementById("visibleCount"),
  cameraSpeed: document.getElementById("cameraSpeed"),
  metricsNote: document.getElementById("metricsNote"),
  iconUploadInput: document.getElementById("iconUploadInput"),
  iconUploadButton: document.getElementById("iconUploadButton"),
  iconResetButton: document.getElementById("iconResetButton"),
  iconPackCount: document.getElementById("iconPackCount"),
  iconPackStatus: document.getElementById("iconPackStatus"),
  controls: {
    bubbleSize: document.getElementById("bubbleSize"),
    peripheralScale: document.getElementById("peripheralScale"),
    centerScale: document.getElementById("centerScale"),
    focusRadius: document.getElementById("focusRadius"),
    farFadeStartRatio: document.getElementById("farFadeStartRatio"),
    gapPx: document.getElementById("gapPx"),
    follow: document.getElementById("follow"),
    inertia: document.getElementById("inertia"),
  },
  colorControls: {
    sceneBackground: document.getElementById("sceneBackgroundColor"),
    circleColor: document.getElementById("circleColor"),
    iconTint: document.getElementById("iconTintColor"),
  },
  outputs: {
    bubbleSize: document.getElementById("bubbleSizeValue"),
    peripheralScale: document.getElementById("peripheralScaleValue"),
    centerScale: document.getElementById("centerScaleValue"),
    focusRadius: document.getElementById("focusRadiusValue"),
    farFadeStartRatio: document.getElementById("farFadeStartRatioValue"),
    gapPx: document.getElementById("gapPxValue"),
    follow: document.getElementById("followValue"),
    inertia: document.getElementById("inertiaValue"),
  },
  colorOutputs: {
    sceneBackground: document.getElementById("sceneBackgroundColorValue"),
    circleColor: document.getElementById("circleColorValue"),
    iconTint: document.getElementById("iconTintColorValue"),
  },
};

const state = {
  settings: { ...DEFAULT_SETTINGS },
  colors: { ...DEFAULT_COLORS },
  view: {
    width: 0,
    height: 0,
    dpr: Math.max(1, window.devicePixelRatio || 1),
  },
  camera: {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0,
    isDragging: false,
    pointerId: null,
    lastPointerX: 0,
    lastPointerY: 0,
    lastPointerTs: 0,
  },
  ease: {
    tracking: false,
    samples: 0,
    violations: 0,
    lastSpeed: Infinity,
  },
  derived: {
    worldPitch: 0,
    maxWorldRadius: 0,
    lutStep: 0,
    screenByWorld: new Float32Array(LUT_SAMPLES),
    maxScreenRadius: 0,
    dirty: true,
  },
  frame: {
    previousTime: 0,
    requestId: 0,
    lastRenderedCells: [],
    metrics: {
      overlapCount: 0,
      minGap: 0,
      gapByRing: { center: 0, mid: 0, edge: 0 },
      cameraSpeed: 0,
      easeMonotonicity: 1,
      visibleCells: 0,
    },
  },
  icons: {
    mode: "default",
    seed: 0,
    items: [],
    statusText: "default circles mode",
    statusLevel: "success",
  },
};

const ctx = refs.canvas.getContext("2d", { alpha: false });
if (!ctx) {
  throw new Error("Canvas 2D context unavailable.");
}

init().catch((error) => {
  console.error("Failed to initialize app", error);
});

async function init() {
  syncControlValues();
  syncColorControlValues();
  bindEvents();
  ensureCanvasSize();
  rebuildDerivedData();

  if (isEmbedMode()) {
    await loadBundledIconsFromManifest();
  } else {
    await restoreCustomIconsFromStorage();
    if (state.icons.mode === "default") {
      await loadBundledIconsFromManifest();
    }
    restoreColorSettingsFromStorage();
  }

  syncIconUi();

  window.__watchGridMetrics = {
    getFrameMetrics() {
      return cloneMetrics(state.frame.metrics);
    },
    getSettings() {
      return { ...state.settings };
    },
    getColorSettings() {
      return { ...state.colors };
    },
    getIconPackInfo() {
      return {
        mode: state.icons.mode,
        count: state.icons.items.length,
        seed: state.icons.seed,
      };
    },
    sampleVisibleIconStats(sampleSize = 512) {
      return sampleVisibleIconStats(sampleSize);
    },
  };

  state.frame.requestId = requestAnimationFrame(tick);
}

function bindEvents() {
  Object.entries(refs.controls).forEach(([name, input]) => {
    if (!input) {
      return;
    }
    input.addEventListener("input", () => {
      applySetting(name, Number(input.value));
    });
  });

  Object.entries(refs.colorControls).forEach(([name, input]) => {
    if (!input) {
      return;
    }
    input.addEventListener("input", () => {
      applyColorSetting(name, input.value);
    });
    input.addEventListener("change", () => {
      applyColorSetting(name, input.value, { persist: true });
    });
  });

  refs.scene.addEventListener("pointerdown", onPointerDown);
  refs.scene.addEventListener("pointermove", onPointerMove);
  refs.scene.addEventListener("pointerup", onPointerUp);
  refs.scene.addEventListener("pointercancel", onPointerUp);

  window.addEventListener("resize", () => {
    ensureCanvasSize();
  });

  if (refs.iconUploadButton && refs.iconUploadInput) {
    refs.iconUploadButton.addEventListener("click", () => {
      refs.iconUploadInput.click();
    });
    refs.iconUploadInput.addEventListener("change", onIconInputChange);
  }

  if (refs.iconResetButton) {
    refs.iconResetButton.addEventListener("click", () => {
      resetCustomIcons({ removeStorage: true, statusMessage: "default circles mode" });
    });
  }
}

function applySetting(name, value) {
  const limit = LIMITS[name];
  if (!limit || !Number.isFinite(value)) {
    return;
  }

  state.settings[name] = clamp(value, limit.min, limit.max);

  if (name === "peripheralScale" && state.settings.centerScale <= state.settings.peripheralScale) {
    state.settings.centerScale = clamp(
      state.settings.peripheralScale + 0.02,
      LIMITS.centerScale.min,
      LIMITS.centerScale.max,
    );
  }

  if (name === "centerScale" && state.settings.centerScale <= state.settings.peripheralScale) {
    state.settings.peripheralScale = clamp(
      state.settings.centerScale - 0.02,
      LIMITS.peripheralScale.min,
      LIMITS.peripheralScale.max,
    );
  }

  state.derived.dirty = true;
  syncControlValues();
}

function applyColorSetting(name, value, options = {}) {
  if (!(name in state.colors)) {
    return;
  }

  const { persist = false } = options;
  const nextColor = normalizeColorHex(value, state.colors[name]);
  const changed = nextColor !== state.colors[name];
  state.colors[name] = nextColor;

  if (changed && name === "iconTint") {
    rebuildTintedIconImages(nextColor);
  }

  syncColorControlValues();

  if (persist) {
    persistColorSettings();
  }
}

function syncControlValues() {
  const { settings } = state;
  const { controls, outputs } = refs;

  if (controls.bubbleSize) controls.bubbleSize.value = String(settings.bubbleSize);
  if (controls.peripheralScale) controls.peripheralScale.value = String(settings.peripheralScale);
  if (controls.centerScale) controls.centerScale.value = String(settings.centerScale);
  if (controls.focusRadius) controls.focusRadius.value = String(settings.focusRadius);
  if (controls.farFadeStartRatio) controls.farFadeStartRatio.value = String(settings.farFadeStartRatio);
  if (controls.gapPx) controls.gapPx.value = String(settings.gapPx);
  if (controls.follow) controls.follow.value = String(settings.follow);
  if (controls.inertia) controls.inertia.value = String(settings.inertia);

  if (outputs.bubbleSize) outputs.bubbleSize.textContent = `${settings.bubbleSize.toFixed(0)}px`;
  if (outputs.peripheralScale) outputs.peripheralScale.textContent = settings.peripheralScale.toFixed(2);
  if (outputs.centerScale) outputs.centerScale.textContent = settings.centerScale.toFixed(2);
  if (outputs.focusRadius) outputs.focusRadius.textContent = `${settings.focusRadius.toFixed(0)}px`;
  if (outputs.farFadeStartRatio) {
    outputs.farFadeStartRatio.textContent = `${Math.round(settings.farFadeStartRatio * 100)}%`;
  }
  if (outputs.gapPx) outputs.gapPx.textContent = `${settings.gapPx.toFixed(1)}px`;
  if (outputs.follow) outputs.follow.textContent = settings.follow.toFixed(2);
  if (outputs.inertia) outputs.inertia.textContent = settings.inertia.toFixed(2);
}

function syncColorControlValues() {
  Object.entries(refs.colorControls).forEach(([name, input]) => {
    if (!input) {
      return;
    }
    input.value = normalizeColorHex(state.colors[name], DEFAULT_COLORS[name]);
  });

  Object.entries(refs.colorOutputs).forEach(([name, output]) => {
    if (!output) {
      return;
    }
    output.textContent = normalizeColorHex(state.colors[name], DEFAULT_COLORS[name]).toUpperCase();
  });
}

async function onIconInputChange(event) {
  const input = event.currentTarget;
  const files = Array.from(input.files || []);
  input.value = "";

  if (!files.length) {
    setIconStatus("No files selected.", "warn");
    return;
  }

  await handleIconUpload(files);
}

async function handleIconUpload(files) {
  const accepted = [];
  const invalid = [];
  let overflowCount = 0;

  for (let i = 0; i < files.length; i += 1) {
    const result = await validateAndPrepareSvg(files[i]);
    if (!result.ok) {
      if (invalid.length < 3) {
        invalid.push(`${files[i].name}: ${result.reason}`);
      }
      continue;
    }

    if (accepted.length < MAX_CUSTOM_ICONS) {
      accepted.push(result.value);
    } else {
      overflowCount += 1;
    }
  }

  if (!accepted.length) {
    const details = invalid.length ? ` (${invalid.join("; ")})` : "";
    setIconStatus(`No valid SVG icons found${details}`, "error");
    return;
  }

  const persistResult = applyCustomIconPack(accepted, nextIconSeed(), { persist: true });

  const notes = [`Loaded ${accepted.length} icon(s).`];
  let level = "success";
  if (invalid.length) {
    notes.push(`Skipped invalid SVGs: ${invalid.join("; ")}`);
    level = "warn";
  }
  if (overflowCount > 0) {
    notes.push(`Ignored ${overflowCount} valid icon(s) over limit ${MAX_CUSTOM_ICONS}.`);
    level = "warn";
  }
  if (!persistResult.ok) {
    notes.push("Storage is unavailable. Pack is active only for this session.");
    level = "warn";
  }

  setIconStatus(notes.join(" "), level);
}

function applyCustomIconPack(items, seed, options = {}) {
  const { persist = false } = options;

  state.icons.mode = items.length ? "custom" : "default";
  state.icons.seed = items.length ? normalizeSeed(seed) : 0;
  state.icons.items = items.map((item) => withIconRuntimeState(item));
  rebuildTintedIconImages(state.colors.iconTint);

  let persistResult = { ok: true };
  if (persist && items.length) {
    persistResult = persistCustomIconPack();
  }

  syncIconUi();
  return persistResult;
}

function resetCustomIcons(options = {}) {
  const { removeStorage = false, statusMessage = "" } = options;

  state.icons.mode = "default";
  state.icons.seed = 0;
  state.icons.items = [];

  let removeResult = { ok: true };
  if (removeStorage) {
    removeResult = removeFromStorage(ICON_STORAGE_KEY);
  }

  if (statusMessage) {
    if (!removeResult.ok) {
      setIconStatus(`${statusMessage}. Storage cleanup failed.`, "warn");
    } else {
      setIconStatus(statusMessage, "success");
    }
  } else {
    syncIconUi();
  }

  return removeResult;
}

async function restoreCustomIconsFromStorage() {
  const stored = readFromStorage(ICON_STORAGE_KEY);
  if (!stored.ok) {
    setIconStatus("Storage unavailable. default circles mode", "warn");
    return;
  }

  if (!stored.value) {
    setIconStatus("default circles mode", "success");
    return;
  }

  let payload;
  try {
    payload = JSON.parse(stored.value);
  } catch (error) {
    removeFromStorage(ICON_STORAGE_KEY);
    setIconStatus("Stored icon pack was corrupted and has been cleared.", "warn");
    return;
  }

  if (!payload || payload.version !== ICON_STORAGE_VERSION || !Array.isArray(payload.icons)) {
    removeFromStorage(ICON_STORAGE_KEY);
    setIconStatus("Stored icon pack had an unsupported format and was cleared.", "warn");
    return;
  }

  const entries = [];
  let invalidCount = 0;

  for (let i = 0; i < payload.icons.length; i += 1) {
    if (entries.length >= MAX_CUSTOM_ICONS) {
      break;
    }

    const rawIcon = payload.icons[i];
    if (!rawIcon || typeof rawIcon.svg !== "string") {
      invalidCount += 1;
      continue;
    }

    const prepared = await validateAndPrepareSvgText(rawIcon.name || `icon-${i + 1}.svg`, rawIcon.svg);
    if (!prepared.ok) {
      invalidCount += 1;
      continue;
    }

    entries.push(prepared.value);
  }

  if (!entries.length) {
    removeFromStorage(ICON_STORAGE_KEY);
    setIconStatus("Stored icon pack contained no valid SVGs. default circles mode", "warn");
    return;
  }

  applyCustomIconPack(entries, payload.seed, { persist: false });
  if (invalidCount > 0) {
    setIconStatus(`Restored ${entries.length} icon(s), skipped ${invalidCount} invalid item(s).`, "warn");
  } else {
    setIconStatus(`Restored ${entries.length} icon(s) from storage.`, "success");
  }
}

function persistCustomIconPack() {
  const payload = {
    version: ICON_STORAGE_VERSION,
    seed: state.icons.seed,
    icons: state.icons.items.map((item) => ({ name: item.name, svg: item.svg })),
  };
  return writeToStorage(ICON_STORAGE_KEY, JSON.stringify(payload));
}

function persistColorSettings() {
  const payload = {
    version: COLOR_SETTINGS_VERSION,
    colors: { ...state.colors },
  };
  return writeToStorage(COLOR_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
}

function restoreColorSettingsFromStorage() {
  state.colors = { ...DEFAULT_COLORS };

  const stored = readFromStorage(COLOR_SETTINGS_STORAGE_KEY);
  if (!stored.ok || !stored.value) {
    syncColorControlValues();
    return;
  }

  let payload;
  try {
    payload = JSON.parse(stored.value);
  } catch (error) {
    removeFromStorage(COLOR_SETTINGS_STORAGE_KEY);
    syncColorControlValues();
    return;
  }

  if (
    !payload ||
    payload.version !== COLOR_SETTINGS_VERSION ||
    typeof payload.colors !== "object" ||
    payload.colors === null
  ) {
    removeFromStorage(COLOR_SETTINGS_STORAGE_KEY);
    syncColorControlValues();
    return;
  }

  const restored = {};
  for (const key of Object.keys(DEFAULT_COLORS)) {
    const rawValue = payload.colors[key];
    if (typeof rawValue !== "string") {
      removeFromStorage(COLOR_SETTINGS_STORAGE_KEY);
      syncColorControlValues();
      return;
    }

    const normalized = normalizeColorHex(rawValue, "");
    if (!normalized) {
      removeFromStorage(COLOR_SETTINGS_STORAGE_KEY);
      syncColorControlValues();
      return;
    }
    restored[key] = normalized;
  }

  state.colors = restored;
  syncColorControlValues();
  rebuildTintedIconImages(state.colors.iconTint);
}

function withIconRuntimeState(item) {
  return {
    ...item,
    tintedColor: "",
    tintedImage: null,
    tintingInFlight: false,
  };
}

function rebuildTintedIconImages(colorValue) {
  const tintColor = normalizeColorHex(colorValue, DEFAULT_COLORS.iconTint);
  for (let i = 0; i < state.icons.items.length; i += 1) {
    ensureTintedIconImage(state.icons.items[i], tintColor);
  }
}

async function ensureTintedIconImage(entry, tintColor) {
  if (!entry || entry.tintedColor === tintColor || entry.tintingInFlight) {
    return;
  }

  entry.tintingInFlight = true;
  try {
    const tintedSvg = createTintedSvgMarkup(entry.svg, tintColor);
    if (!tintedSvg) {
      entry.tintedImage = null;
      entry.tintedColor = "";
      return;
    }

    const imageResult = await loadSvgImage(tintedSvg);
    if (!imageResult.ok) {
      entry.tintedImage = null;
      entry.tintedColor = "";
      return;
    }

    if (normalizeColorHex(state.colors.iconTint, DEFAULT_COLORS.iconTint) !== tintColor) {
      return;
    }

    entry.tintedImage = imageResult.value;
    entry.tintedColor = tintColor;
  } finally {
    entry.tintingInFlight = false;
  }
}

function createTintedSvgMarkup(svgText, tintColor) {
  const parsed = parseSvgRoot(svgText);
  if (!parsed.ok) {
    return null;
  }

  const root = parsed.value.cloneNode(true);
  const doc = root.ownerDocument;
  const ns = "http://www.w3.org/2000/svg";
  const filterId = "__codex_tint_filter";

  const tintDefs = doc.createElementNS(ns, "defs");
  const filter = doc.createElementNS(ns, "filter");
  filter.setAttribute("id", filterId);
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const flood = doc.createElementNS(ns, "feFlood");
  flood.setAttribute("flood-color", tintColor);
  flood.setAttribute("result", "tintFlood");
  filter.appendChild(flood);

  const composite = doc.createElementNS(ns, "feComposite");
  composite.setAttribute("in", "tintFlood");
  composite.setAttribute("in2", "SourceGraphic");
  composite.setAttribute("operator", "in");
  filter.appendChild(composite);
  tintDefs.appendChild(filter);
  root.insertBefore(tintDefs, root.firstChild);

  const tintGroup = doc.createElementNS(ns, "g");
  tintGroup.setAttribute("filter", `url(#${filterId})`);

  const originalChildren = Array.from(root.childNodes);
  for (let i = 0; i < originalChildren.length; i += 1) {
    const child = originalChildren[i];
    if (child === tintDefs) {
      continue;
    }
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      child.localName &&
      child.localName.toLowerCase() === "defs"
    ) {
      continue;
    }
    tintGroup.appendChild(child);
  }

  root.appendChild(tintGroup);
  return new XMLSerializer().serializeToString(root);
}

async function validateAndPrepareSvg(file) {
  if (!file || typeof file.text !== "function") {
    return { ok: false, reason: "unsupported file payload" };
  }

  if (typeof file.size === "number" && file.size > MAX_ICON_FILE_BYTES) {
    return { ok: false, reason: `file too large (${file.size} bytes)` };
  }

  let text;
  try {
    text = await file.text();
  } catch (error) {
    return { ok: false, reason: "file read failed" };
  }

  return validateAndPrepareSvgText(file.name || "icon.svg", text);
}

async function validateAndPrepareSvgText(name, svgText) {
  if (typeof svgText !== "string" || !svgText.trim()) {
    return { ok: false, reason: "empty svg" };
  }

  const parsed = parseSvgRoot(svgText);
  if (!parsed.ok) {
    return parsed;
  }

  const blockedContent = inspectSvgTreeForBlockedContent(parsed.value);
  if (blockedContent) {
    return { ok: false, reason: blockedContent };
  }

  sanitizeSvgTree(parsed.value);
  const serialized = new XMLSerializer().serializeToString(parsed.value);
  const image = await loadSvgImage(serialized);
  if (!image.ok) {
    return image;
  }

  return {
    ok: true,
    value: {
      name,
      svg: serialized,
      image: image.value,
    },
  };
}

async function loadBundledIconsFromManifest() {
  let manifestResponse;
  try {
    manifestResponse = await fetch(ICONS_MANIFEST_URL);
  } catch {
    if (isEmbedMode()) {
      console.warn("Watch grid: could not fetch icons/manifest.json");
    } else {
      setIconStatus("Could not load icon manifest.", "warn");
    }
    return;
  }

  if (!manifestResponse.ok) {
    if (!isEmbedMode()) {
      setIconStatus("Icon manifest unavailable.", "warn");
    }
    return;
  }

  let names;
  try {
    names = await manifestResponse.json();
  } catch {
    setIconStatus("Invalid icon manifest JSON.", "error");
    return;
  }

  if (!Array.isArray(names) || names.length === 0) {
    setIconStatus("Icon manifest is empty.", "warn");
    return;
  }

  const accepted = [];
  const invalid = [];

  for (let i = 0; i < names.length; i += 1) {
    if (accepted.length >= MAX_CUSTOM_ICONS) {
      break;
    }

    const rawName = names[i];
    if (typeof rawName !== "string" || !rawName.toLowerCase().endsWith(".svg")) {
      continue;
    }

    const assetUrl = `${ICONS_BASE}${encodeURIComponent(rawName)}`;
    let res;
    try {
      res = await fetch(assetUrl);
    } catch {
      if (invalid.length < 8) {
        invalid.push(`${rawName}: fetch failed`);
      }
      continue;
    }

    if (!res.ok) {
      if (invalid.length < 8) {
        invalid.push(`${rawName}: HTTP ${res.status}`);
      }
      continue;
    }

    let text;
    try {
      text = await res.text();
    } catch {
      if (invalid.length < 8) {
        invalid.push(`${rawName}: read failed`);
      }
      continue;
    }

    if (text.length > MAX_ICON_FILE_BYTES) {
      if (invalid.length < 8) {
        invalid.push(`${rawName}: too large`);
      }
      continue;
    }

    const prepared = await validateAndPrepareSvgText(rawName, text);
    if (!prepared.ok) {
      const reason = typeof prepared.reason === "string" ? prepared.reason : "invalid svg";
      if (invalid.length < 8) {
        invalid.push(`${rawName}: ${reason}`);
      }
      continue;
    }

    accepted.push(prepared.value);
  }

  if (!accepted.length) {
    const details = invalid.length ? ` (${invalid.slice(0, 3).join("; ")})` : "";
    setIconStatus(`No bundled SVG icons could be loaded${details}`, isEmbedMode() ? "error" : "warn");
    return;
  }

  applyCustomIconPack(accepted, nextIconSeed(), { persist: false });

  const notes = [`Loaded ${accepted.length} icon(s) from icons/.`];
  let level = "success";
  if (invalid.length) {
    notes.push(`Skipped: ${invalid.join("; ")}`);
    level = "warn";
  }
  setIconStatus(notes.join(" "), level);
}

function parseSvgRoot(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");

  if (doc.querySelector("parsererror")) {
    return { ok: false, reason: "invalid svg xml" };
  }

  const root = doc.documentElement;
  if (!root || root.localName?.toLowerCase() !== "svg") {
    return { ok: false, reason: "root element is not svg" };
  }

  return { ok: true, value: root };
}

function inspectSvgTreeForBlockedContent(root) {
  const blockedTags = new Set(["script", "foreignobject"]);
  const queue = [root];

  while (queue.length) {
    const node = queue.shift();
    if (node.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = node;
    const tag = element.localName ? element.localName.toLowerCase() : "";
    if (blockedTags.has(tag)) {
      return `blocked element <${tag}>`;
    }

    const attrs = Array.from(element.attributes);
    for (let i = 0; i < attrs.length; i += 1) {
      const attr = attrs[i];
      const attrName = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (attrName.startsWith("on")) {
        return `blocked attribute ${attr.name}`;
      }
      if ((attrName === "href" || attrName.endsWith(":href")) && value.startsWith("javascript:")) {
        return `blocked javascript href in ${attr.name}`;
      }
    }

    queue.push(...Array.from(element.children));
  }

  return null;
}

function sanitizeSvgTree(root) {
  const blockedTags = new Set(["script", "foreignobject"]);

  const visit = (node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const element = node;
    const tag = element.localName ? element.localName.toLowerCase() : "";
    if (blockedTags.has(tag)) {
      element.remove();
      return;
    }

    const attrs = Array.from(element.attributes);
    for (let i = 0; i < attrs.length; i += 1) {
      const attr = attrs[i];
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on")) {
        element.removeAttribute(attr.name);
        continue;
      }
      if ((name === "href" || name.endsWith(":href")) && value.startsWith("javascript:")) {
        element.removeAttribute(attr.name);
      }
    }

    const children = Array.from(element.children);
    for (let i = 0; i < children.length; i += 1) {
      visit(children[i]);
    }
  };

  visit(root);
}

async function loadSvgImage(svg) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("svg decode failed"));
      img.src = url;
    });
    return { ok: true, value: image };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "svg decode failed" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function setIconStatus(text, level) {
  state.icons.statusText = text;
  state.icons.statusLevel = level;
  syncIconUi();
}

function syncIconUi() {
  if (refs.iconPackCount) {
    refs.iconPackCount.textContent = `icons: ${state.icons.items.length} · mode: ${state.icons.mode}`;
  }

  if (refs.iconPackStatus) {
    refs.iconPackStatus.textContent = state.icons.statusText;
    refs.iconPackStatus.classList.remove("is-success", "is-warn", "is-error");
    if (state.icons.statusLevel === "success") {
      refs.iconPackStatus.classList.add("is-success");
    } else if (state.icons.statusLevel === "warn") {
      refs.iconPackStatus.classList.add("is-warn");
    } else if (state.icons.statusLevel === "error") {
      refs.iconPackStatus.classList.add("is-error");
    }
  }

  if (refs.iconResetButton) {
    refs.iconResetButton.disabled = state.icons.mode !== "custom";
  }
}

function sampleVisibleIconStats(sampleSize = 512) {
  if (state.icons.mode !== "custom" || state.icons.items.length === 0) {
    return {
      mode: state.icons.mode,
      count: state.icons.items.length,
      sampled: 0,
      visibleCells: state.frame.lastRenderedCells.length,
      uniqueIconIndices: 0,
    };
  }

  const cells = state.frame.lastRenderedCells;
  if (!Array.isArray(cells) || cells.length === 0) {
    return {
      mode: state.icons.mode,
      count: state.icons.items.length,
      sampled: 0,
      visibleCells: 0,
      uniqueIconIndices: 0,
    };
  }

  const normalizedSample = Number.isFinite(sampleSize) ? Math.floor(sampleSize) : 512;
  const sampleCount = Math.min(cells.length, Math.max(1, normalizedSample));
  const step = Math.max(1, Math.floor(cells.length / sampleCount));
  const unique = new Set();

  for (let i = 0, idx = 0; i < sampleCount; i += 1, idx += step) {
    const cell = cells[Math.min(cells.length - 1, idx)];
    unique.add(iconIndexForCell(cell.q, cell.r, state.icons.seed, state.icons.items.length));
  }

  return {
    mode: state.icons.mode,
    count: state.icons.items.length,
    sampled: sampleCount,
    visibleCells: cells.length,
    uniqueIconIndices: unique.size,
  };
}

function normalizeSeed(seed) {
  if (Number.isFinite(seed)) {
    return seed >>> 0;
  }
  return nextIconSeed();
}

function nextIconSeed() {
  return (Math.floor(Math.random() * 4294967295) ^ Date.now()) >>> 0;
}

function writeToStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function readFromStorage(key) {
  try {
    return { ok: true, value: localStorage.getItem(key) };
  } catch (error) {
    return { ok: false, value: null, error };
  }
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function onPointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  refs.scene.setPointerCapture(event.pointerId);
  refs.scene.classList.add("is-dragging");

  const { camera, ease } = state;
  camera.isDragging = true;
  camera.pointerId = event.pointerId;
  camera.lastPointerX = event.clientX;
  camera.lastPointerY = event.clientY;
  camera.lastPointerTs = event.timeStamp || performance.now();
  camera.vx = 0;
  camera.vy = 0;

  ease.tracking = false;
  ease.samples = 0;
  ease.violations = 0;
  ease.lastSpeed = Infinity;
}

function onPointerMove(event) {
  const { camera } = state;
  if (!camera.isDragging || camera.pointerId !== event.pointerId) {
    return;
  }

  const now = event.timeStamp || performance.now();
  const dt = Math.max(1, now - camera.lastPointerTs);
  const dx = event.clientX - camera.lastPointerX;
  const dy = event.clientY - camera.lastPointerY;

  camera.targetX += dx;
  camera.targetY += dy;

  const speedScale = 16.6667 / dt;
  camera.vx = clamp(dx * speedScale, -MAX_POINTER_SPEED, MAX_POINTER_SPEED);
  camera.vy = clamp(dy * speedScale, -MAX_POINTER_SPEED, MAX_POINTER_SPEED);

  camera.lastPointerX = event.clientX;
  camera.lastPointerY = event.clientY;
  camera.lastPointerTs = now;
}

function onPointerUp(event) {
  const { camera, ease } = state;
  if (camera.pointerId !== event.pointerId) {
    return;
  }

  if (refs.scene.hasPointerCapture(event.pointerId)) {
    refs.scene.releasePointerCapture(event.pointerId);
  }

  camera.isDragging = false;
  camera.pointerId = null;
  refs.scene.classList.remove("is-dragging");

  ease.tracking = true;
  ease.samples = 0;
  ease.violations = 0;
  ease.lastSpeed = Infinity;
}

function tick(timestamp) {
  const previous = state.frame.previousTime || timestamp;
  const dtSeconds = clamp((timestamp - previous) / 1000, 1 / 120, 1 / 15);
  state.frame.previousTime = timestamp;

  ensureCanvasSize();
  updateCamera(dtSeconds);

  if (state.derived.dirty) {
    rebuildDerivedData();
  }

  renderScene();
  state.frame.requestId = requestAnimationFrame(tick);
}

function updateCamera(dtSeconds) {
  const { camera, settings, ease } = state;

  if (!camera.isDragging) {
    const decay = Math.pow(effectiveInertia(settings.inertia), dtSeconds * 60);
    camera.vx *= decay;
    camera.vy *= decay;

    if (Math.abs(camera.vx) < STOP_EPSILON) {
      camera.vx = 0;
    }
    if (Math.abs(camera.vy) < STOP_EPSILON) {
      camera.vy = 0;
    }

    camera.targetX += camera.vx;
    camera.targetY += camera.vy;

    if (ease.tracking) {
      const speed = Math.hypot(camera.vx, camera.vy);
      if (ease.samples > 0 && speed > ease.lastSpeed + 0.004) {
        ease.violations += 1;
      }

      ease.samples += 1;
      ease.lastSpeed = speed;

      if (speed <= STOP_EPSILON) {
        ease.tracking = false;
      }
    }
  }

  const followAlpha = 1 - Math.pow(1 - settings.follow, dtSeconds * 60);
  camera.x += (camera.targetX - camera.x) * followAlpha;
  camera.y += (camera.targetY - camera.y) * followAlpha;
}

function renderScene() {
  const { width, height } = state.view;

  if (width <= 0 || height <= 0) {
    return;
  }

  const focus = { x: width * 0.5, y: height * 0.5 };
  const cells = collectProjectedCells(focus);
  relaxProjectedCells(cells);
  const metrics = computeFrameMetrics(cells);

  state.frame.metrics = {
    ...metrics,
    cameraSpeed: Number(Math.hypot(state.camera.vx, state.camera.vy).toFixed(4)),
    easeMonotonicity: getEaseMonotonicity(),
    visibleCells: cells.length,
  };
  state.frame.lastRenderedCells = cells;

  paintCells(cells);
  syncMeta();
}

function collectProjectedCells(focus) {
  const { width, height } = state.view;
  const { worldPitch } = state.derived;

  const screenRadius = Math.hypot(width, height) * 0.5 + COVERAGE_MARGIN + state.settings.bubbleSize;
  const worldRadius = screenToWorldRadius(screenRadius);
  const ring = Math.ceil(worldRadius / worldPitch) + 4;

  const centerAxial = axialRound(worldToAxial(state.camera.x, state.camera.y, worldPitch));
  const cells = [];
  const indexByKey = new Map();
  const disk = generateHexDisk(centerAxial.q, centerAxial.r, ring);

  for (let i = 0; i < disk.length; i += 1) {
    const { q, r } = disk[i];
    const world = axialToWorld(q, r, worldPitch);
    const localX = world.x - state.camera.x;
    const localY = world.y - state.camera.y;
    const worldR = Math.hypot(localX, localY);

    if (worldR > worldRadius + worldPitch * 2) {
      continue;
    }

    const screenR = worldToScreenRadius(worldR);
    const baseScale = scaleAtWorldRadius(worldR);
    const scale = baseScale * farShrinkAtScreenRadius(screenR, width, height);

    let nx = 0;
    let ny = 0;
    if (worldR > 0.000001) {
      nx = localX / worldR;
      ny = localY / worldR;
    }

    const x = focus.x + nx * screenR;
    const y = focus.y + ny * screenR;
    const radius = state.settings.bubbleSize * scale * 0.5;
    if (radius < MIN_VISIBLE_RADIUS_PX) {
      continue;
    }

    if (
      x < -radius - COVERAGE_MARGIN ||
      x > width + radius + COVERAGE_MARGIN ||
      y < -radius - COVERAGE_MARGIN ||
      y > height + radius + COVERAGE_MARGIN
    ) {
      continue;
    }

    const key = hexKey(q, r);
    const cell = {
      q,
      r,
      key,
      x,
      y,
      scale,
      radius,
      worldR,
      screenR,
    };

    indexByKey.set(key, cells.length);
    cells.push(cell);
  }

  state.lastCellIndexByKey = indexByKey;
  return cells;
}

function relaxProjectedCells(cells) {
  if (cells.length === 0) {
    return;
  }

  const indexByKey = state.lastCellIndexByKey;
  const maxRelaxRadius = state.settings.focusRadius * RELAX_ZONE_MULTIPLIER;
  const targetGap = state.settings.gapPx;

  for (let pass = 0; pass < RELAX_PASSES; pass += 1) {
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      if (cell.worldR > maxRelaxRadius) {
        continue;
      }

      for (let d = 0; d < HEX_DIRECTIONS.length; d += 1) {
        const dir = HEX_DIRECTIONS[d];
        const neighborKey = hexKey(cell.q + dir.q, cell.r + dir.r);
        const j = indexByKey.get(neighborKey);

        if (j === undefined || j <= i) {
          continue;
        }

        const neighbor = cells[j];
        if (neighbor.worldR > maxRelaxRadius) {
          continue;
        }

        let dx = neighbor.x - cell.x;
        let dy = neighbor.y - cell.y;
        let dist = Math.hypot(dx, dy);

        if (dist < 0.0001) {
          dx = dir.q * 0.866 + dir.r * 0.31;
          dy = dir.r * 0.82;
          dist = Math.hypot(dx, dy);
        }

        const preferredDist = cell.radius + neighbor.radius + targetGap;
        const delta = dist - preferredDist;
        if (Math.abs(delta) < 0.02) {
          continue;
        }

        const nx = dx / dist;
        const ny = dy / dist;
        const localWeight =
          1 - clamp(Math.max(cell.worldR, neighbor.worldR) / Math.max(1, maxRelaxRadius), 0, 1);

        let correction = 0;
        if (delta < 0) {
          correction = Math.min((-delta * 0.52) * RELAX_FACTOR, 4.8) * (0.7 + localWeight * 0.5);
          cell.x -= nx * correction;
          cell.y -= ny * correction;
          neighbor.x += nx * correction;
          neighbor.y += ny * correction;
        } else {
          correction = Math.min(delta * 0.14, 1.6) * (0.45 + localWeight * 0.4);
          cell.x += nx * correction;
          cell.y += ny * correction;
          neighbor.x -= nx * correction;
          neighbor.y -= ny * correction;
        }
      }
    }
  }
}

function computeFrameMetrics(cells) {
  if (cells.length === 0) {
    return {
      overlapCount: 0,
      minGap: 0,
      gapByRing: { center: 0, mid: 0, edge: 0 },
    };
  }

  const indexByKey = state.lastCellIndexByKey;
  const ringSamples = {
    center: [],
    mid: [],
    edge: [],
  };
  const relaxLimit = state.settings.focusRadius * RELAX_ZONE_MULTIPLIER;

  let overlapCount = 0;
  let minGap = Number.POSITIVE_INFINITY;

  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];

    for (let d = 0; d < HEX_DIRECTIONS.length; d += 1) {
      const dir = HEX_DIRECTIONS[d];
      const neighborKey = hexKey(cell.q + dir.q, cell.r + dir.r);
      const j = indexByKey.get(neighborKey);

      if (j === undefined || j <= i) {
        continue;
      }

      const neighbor = cells[j];
      const dx = neighbor.x - cell.x;
      const dy = neighbor.y - cell.y;
      const dist = Math.hypot(dx, dy);
      const gap = dist - (cell.radius + neighbor.radius);

      if (gap < 0) {
        overlapCount += 1;
      }
      if (gap < minGap) {
        minGap = gap;
      }

      const worldRadius = (cell.worldR + neighbor.worldR) * 0.5;
      if (worldRadius <= relaxLimit) {
        const ring = ringNameByWorld(worldRadius, state.settings.focusRadius);
        ringSamples[ring].push(gap);
      }
    }
  }

  if (!Number.isFinite(minGap)) {
    minGap = 0;
  }

  return {
    overlapCount,
    minGap: Number(minGap.toFixed(3)),
    gapByRing: {
      center: median(ringSamples.center),
      mid: median(ringSamples.mid),
      edge: median(ringSamples.edge),
    },
  };
}

function paintCells(cells) {
  const { width, height } = state.view;
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = state.colors.sceneBackground;
  ctx.fillRect(0, 0, width, height);

  cells.sort((a, b) => a.radius - b.radius);

  if (state.icons.mode === "custom" && state.icons.items.length > 0) {
    paintCustomIcons(cells);
    ctx.restore();
    return;
  }

  const minScale = state.settings.peripheralScale;
  const maxScale = state.settings.centerScale;
  const scaleRange = Math.max(0.0001, maxScale - minScale);
  const baseCircleHsl = hexToHsl(state.colors.circleColor);
  const baseHue = baseCircleHsl.h.toFixed(2);
  const baseSaturation = baseCircleHsl.s.toFixed(2);
  const baseLightness = baseCircleHsl.l;

  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const t = clamp((cell.scale - minScale) / scaleRange, 0, 1);
    const lightness = clamp(baseLightness - 8 + t * 16 + cellToneOffset(cell.q, cell.r), 6, 92);

    ctx.beginPath();
    ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${baseHue} ${baseSaturation}% ${lightness.toFixed(2)}%)`;
    ctx.fill();

    if (cell.radius > 7) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function paintCustomIcons(cells) {
  const iconCount = state.icons.items.length;
  if (!iconCount) {
    return;
  }

  const tintColor = normalizeColorHex(state.colors.iconTint, DEFAULT_COLORS.iconTint);
  ctx.imageSmoothingEnabled = true;

  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const iconIndex = iconIndexForCell(cell.q, cell.r, state.icons.seed, iconCount);
    const entry = state.icons.items[iconIndex];
    if (!entry?.image) {
      continue;
    }

    const iconDiameter = cell.radius * 2 * ICON_DRAW_DIAMETER_RATIO;
    const iconHalf = iconDiameter * 0.5;
    const iconImage = entry.tintedColor === tintColor && entry.tintedImage ? entry.tintedImage : entry.image;

    if (entry.tintedColor !== tintColor && !entry.tintingInFlight) {
      ensureTintedIconImage(entry, tintColor);
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
    ctx.clip();
    drawImageContain(iconImage, cell.x - iconHalf, cell.y - iconHalf, iconDiameter, iconDiameter);
    ctx.restore();
  }
}

function syncMeta() {
  const metrics = state.frame.metrics;

  if (refs.visibleCount) {
    refs.visibleCount.textContent = `visible: ${metrics.visibleCells}`;
  }
  if (refs.cameraSpeed) {
    refs.cameraSpeed.textContent = `speed: ${metrics.cameraSpeed.toFixed(2)}`;
  }
  if (refs.metricsNote) {
    refs.metricsNote.textContent =
      `overlap: ${metrics.overlapCount} · min gap: ${metrics.minGap.toFixed(2)} · ` +
      `ease: ${metrics.easeMonotonicity.toFixed(2)}`;
  }
}

function rebuildDerivedData() {
  const { width, height } = state.view;
  const { settings, derived } = state;

  if (width <= 0 || height <= 0) {
    return;
  }

  derived.worldPitch = settings.bubbleSize * NOMINAL_WORLD_SCALE + settings.gapPx;
  derived.maxWorldRadius = Math.hypot(width, height) * 2.6;
  derived.lutStep = derived.maxWorldRadius / (LUT_SAMPLES - 1);

  let acc = 0;
  derived.screenByWorld[0] = 0;

  for (let i = 1; i < LUT_SAMPLES; i += 1) {
    const r0 = (i - 1) * derived.lutStep;
    const r1 = i * derived.lutStep;
    const l0 = lambdaAtRadius(r0);
    const l1 = lambdaAtRadius(r1);

    acc += ((l0 + l1) * 0.5) * derived.lutStep;
    derived.screenByWorld[i] = acc;
  }

  derived.maxScreenRadius = derived.screenByWorld[LUT_SAMPLES - 1];
  derived.dirty = false;
}

function ensureCanvasSize() {
  const rect = refs.scene.getBoundingClientRect();
  const width = Math.max(0, Math.round(rect.width));
  const height = Math.max(0, Math.round(rect.height));

  if (width === 0 || height === 0) {
    return;
  }

  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);

  if (
    width === state.view.width &&
    height === state.view.height &&
    dpr === state.view.dpr &&
    refs.canvas.width === pixelWidth &&
    refs.canvas.height === pixelHeight
  ) {
    return;
  }

  state.view.width = width;
  state.view.height = height;
  state.view.dpr = dpr;

  refs.canvas.width = pixelWidth;
  refs.canvas.height = pixelHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  state.derived.dirty = true;
}

function worldToScreenRadius(worldRadius) {
  if (worldRadius <= 0) {
    return 0;
  }

  const { lutStep, screenByWorld, maxWorldRadius } = state.derived;
  if (worldRadius >= maxWorldRadius) {
    const overflow = worldRadius - maxWorldRadius;
    return state.derived.maxScreenRadius + overflow * lambdaAtRadius(maxWorldRadius);
  }

  const idx = worldRadius / lutStep;
  const low = Math.floor(idx);
  const high = Math.min(LUT_SAMPLES - 1, low + 1);
  const t = idx - low;

  return lerp(screenByWorld[low], screenByWorld[high], t);
}

function screenToWorldRadius(screenRadius) {
  if (screenRadius <= 0) {
    return 0;
  }

  const { screenByWorld, maxScreenRadius, maxWorldRadius, lutStep } = state.derived;
  if (screenRadius >= maxScreenRadius) {
    const overflow = screenRadius - maxScreenRadius;
    const lambda = Math.max(0.0001, lambdaAtRadius(maxWorldRadius));
    return maxWorldRadius + overflow / lambda;
  }

  let lo = 0;
  let hi = LUT_SAMPLES - 1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (screenByWorld[mid] < screenRadius) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const upper = clamp(lo, 1, LUT_SAMPLES - 1);
  const lower = upper - 1;

  const s0 = screenByWorld[lower];
  const s1 = screenByWorld[upper];
  const t = s1 === s0 ? 0 : (screenRadius - s0) / (s1 - s0);

  return (lower + t) * lutStep;
}

function scaleAtWorldRadius(worldRadius) {
  const minScale = state.settings.peripheralScale;
  const maxScale = state.settings.centerScale;
  const normalized = worldRadius / Math.max(1, state.settings.focusRadius);
  const falloff = Math.exp(-Math.pow(normalized, 2.2));

  return minScale + (maxScale - minScale) * falloff;
}

function farShrinkAtScreenRadius(screenRadius, viewportWidth, viewportHeight) {
  const viewportCornerRadiusPx = Math.hypot(viewportWidth, viewportHeight) * 0.5;
  const fadeStartPx = state.settings.farFadeStartRatio * viewportCornerRadiusPx;
  if (screenRadius <= fadeStartPx) {
    return 1;
  }

  const t = clamp((screenRadius - fadeStartPx) / FAR_SHRINK_TRANSITION_PX, 0, 1);
  return Math.pow(1 - t, 3);
}

function lambdaAtRadius(worldRadius) {
  const desiredPitch = state.settings.bubbleSize * scaleAtWorldRadius(worldRadius) + state.settings.gapPx;
  return desiredPitch / state.derived.worldPitch;
}

function effectiveInertia(rawInertia) {
  const clampedInertia = clamp(rawInertia, LIMITS.inertia.min, LIMITS.inertia.max);
  const normalized =
    (clampedInertia - LIMITS.inertia.min) / Math.max(0.000001, LIMITS.inertia.max - LIMITS.inertia.min);

  return lerp(LIMITS.inertia.min, INERTIA_EFFECTIVE_MAX, normalized);
}

function getEaseMonotonicity() {
  const { samples, violations } = state.ease;
  if (samples <= 1) {
    return 1;
  }

  const value = 1 - violations / (samples - 1);
  return Number(clamp(value, 0, 1).toFixed(4));
}

function ringNameByWorld(worldRadius, focusRadius) {
  if (worldRadius < focusRadius * 0.45) {
    return "center";
  }
  if (worldRadius < focusRadius * 0.9) {
    return "mid";
  }
  return "edge";
}

function median(values) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return Number(((sorted[half - 1] + sorted[half]) * 0.5).toFixed(3));
  }

  return Number(sorted[half].toFixed(3));
}

function cloneMetrics(metrics) {
  return {
    overlapCount: metrics.overlapCount,
    minGap: metrics.minGap,
    gapByRing: {
      center: metrics.gapByRing.center,
      mid: metrics.gapByRing.mid,
      edge: metrics.gapByRing.edge,
    },
    cameraSpeed: metrics.cameraSpeed,
    easeMonotonicity: metrics.easeMonotonicity,
    visibleCells: metrics.visibleCells,
  };
}

function axialToWorld(q, r, pitch) {
  return {
    x: pitch * (q + r * 0.5),
    y: pitch * (r * SQRT3_OVER_2),
  };
}

function worldToAxial(x, y, pitch) {
  const r = y / (pitch * SQRT3_OVER_2);
  const q = x / pitch - r * 0.5;
  return { q, r };
}

function axialRound(axial) {
  const x = axial.q;
  const z = axial.r;
  const y = -x - z;

  let rx = Math.round(x);
  let ry = Math.round(y);
  let rz = Math.round(z);

  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);

  if (dx > dy && dx > dz) {
    rx = -ry - rz;
  } else if (dy > dz) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}

function generateHexDisk(centerQ, centerR, radius) {
  const cells = [];

  for (let dq = -radius; dq <= radius; dq += 1) {
    const minDr = Math.max(-radius, -dq - radius);
    const maxDr = Math.min(radius, -dq + radius);

    for (let dr = minDr; dr <= maxDr; dr += 1) {
      cells.push({ q: centerQ + dq, r: centerR + dr });
    }
  }

  return cells;
}

function hexKey(q, r) {
  return `${q}:${r}`;
}

function cellToneOffset(q, r) {
  let hash = Math.imul(q, 73856093) ^ Math.imul(r, 19349663);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 1274126177);
  const normalized = (hash >>> 0) / 4294967295;
  return (normalized - 0.5) * 5.5;
}

function iconIndexForCell(q, r, seed, iconCount) {
  if (iconCount <= 1) {
    return 0;
  }

  let hash = seed >>> 0;
  hash ^= Math.imul(q, 374761393);
  hash ^= Math.imul(r, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  hash ^= hash >>> 16;
  return (hash >>> 0) % iconCount;
}

function drawImageContain(image, x, y, width, height) {
  const srcW = Math.max(1, image.naturalWidth || image.width || 1);
  const srcH = Math.max(1, image.naturalHeight || image.height || 1);
  const scale = Math.min(width / srcW, height / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const dx = x + (width - drawW) * 0.5;
  const dy = y + (height - drawH) * 0.5;

  ctx.drawImage(image, dx, dy, drawW, drawH);
}

function normalizeColorHex(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) {
    return normalized;
  }
  return fallback;
}

function hexToHsl(hex) {
  const normalized = normalizeColorHex(hex, DEFAULT_COLORS.circleColor);
  const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
  const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
  const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let hue = 0;
  if (delta > 0) {
    if (max === r) {
      hue = ((g - b) / delta) % 6;
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
  }

  const lightness = (max + min) * 0.5;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: (hue * 60 + 360) % 360,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
