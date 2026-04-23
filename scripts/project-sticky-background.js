/**
 * Scroll-scrubbed project background, fixed header art, and text colors (desktop).
 * See artifacts/project-section-scroll-spec-2026-04-23.md
 */
(function () {
  var PROJECT_ORDER = ["featured", "madebymad", "odds", "curves"];
  var PRELUDE = "prelude";
  var EPS = 1.5;
  var MQ = "(min-width: 1024px)";

  var elMain = null;
  var raf = 0;
  var refMap = null;
  var colorTable = null;
  var lock = { toId: null, y0: null };
  var lastPair = { from: PRELUDE, to: "featured", t: 0 };
  var reducedMotion = false;
  var scrollW = 0;
  var mql;
  var scrollHandler = null;
  var resizeHandler = null;
  var reduceHandler = null;

  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  function mix(a, b, t) {
    return a + (b - a) * t;
  }

  function parseRgb(colorStr) {
    if (!colorStr) return { r: 0, g: 0, b: 0 };
    var s = String(colorStr).trim();
    var m;
    m = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/i);
    if (m) {
      return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
    }
    return { r: 0, g: 0, b: 0 };
  }

  function rgbString(rgb) {
    return "rgb(" + Math.round(rgb.r) + "," + Math.round(rgb.g) + "," + Math.round(rgb.b) + ")";
  }

  function lerpColor(a, b, t) {
    return {
      r: mix(a.r, b.r, t),
      g: mix(a.g, b.g, t),
      b: mix(a.b, b.b, t)
    };
  }

  function prevId(id) {
    if (id === "featured") {
      return PRELUDE;
    }
    var i = PROJECT_ORDER.indexOf(id);
    if (i <= 0) {
      return PRELUDE;
    }
    return PROJECT_ORDER[i - 1];
  }

  function headerThemeFor(refId) {
    if (refId === PRELUDE) {
      return "dark";
    }
    var el = document.querySelector('section[data-project="' + refId + '"]');
    if (!el) {
      return "dark";
    }
    var th = el.getAttribute("data-header-theme");
    return th === "light" || th === "dark" ? th : "dark";
  }

  function getHeaderTop(section) {
    var h = section.querySelector(".section-header");
    if (!h) {
      return 0;
    }
    return h.getBoundingClientRect().top;
  }

  function findDeepestStuck(sections) {
    var best = null;
    var bestOff = -Infinity;
    var i;
    for (i = 0; i < sections.length; i += 1) {
      var top = getHeaderTop(sections[i]);
      if (Math.abs(top) < EPS) {
        var o = sections[i].offsetTop;
        if (o > bestOff) {
          bestOff = o;
          best = sections[i];
        }
      }
    }
    return best;
  }

  function findApproaching(sections) {
    var i;
    var minTop = Infinity;
    var best = null;
    for (i = 0; i < sections.length; i += 1) {
      var top = getHeaderTop(sections[i]);
      if (top > EPS && top < minTop) {
        minTop = top;
        best = sections[i];
      }
    }
    return best;
  }

  function findSteadyWhenPast(sections) {
    var i;
    for (i = sections.length - 1; i >= 0; i -= 1) {
      var r = sections[i].getBoundingClientRect();
      if (r.bottom > 0) {
        return sections[i].getAttribute("data-project");
      }
    }
    return null;
  }

  function buildColorRowFromRef(el) {
    if (!el) {
      return null;
    }
    var title = el.querySelector("h2.section-title");
    var body = el.querySelector("p.prose.section-title");
    var meta = el.querySelector("p.section-header__meta");
    if (!title || !body || !meta) {
      return null;
    }
    return {
      title: parseRgb(getComputedStyle(title).color),
      body: parseRgb(getComputedStyle(body).color),
      meta: parseRgb(getComputedStyle(meta).color)
    };
  }

  function cacheColorTable() {
    var out = Object.create(null);
    var keys = [PRELUDE].concat(PROJECT_ORDER);
    var k;
    for (k = 0; k < keys.length; k += 1) {
      var el = refMap[keys[k]];
      if (el) {
        out[keys[k]] = buildColorRowFromRef(el);
      }
    }
    colorTable = out;
  }

  function buildRefMap() {
    var root = document.querySelector(".project-color-refs");
    if (!root) {
      return;
    }
    var map = Object.create(null);
    var nodes = root.querySelectorAll("[data-color-ref]");
    var i;
    for (i = 0; i < nodes.length; i += 1) {
      var n = nodes[i];
      var id = n.getAttribute("data-color-ref");
      if (id) {
        map[id] = n;
      }
    }
    refMap = map;
  }

  function layerOpacity(from, to, t, layerId) {
    return (from === layerId ? 1 - t : 0) + (to === layerId ? t : 0);
  }

  function clearSectionTextColors(sections) {
    var sels = ["h2.section-title", "p.prose.section-title", "p.section-header__meta"];
    var i;
    var j;
    for (i = 0; i < sections.length; i += 1) {
      var content = sections[i].querySelector(".section-header__content");
      if (!content) {
        continue;
      }
      for (j = 0; j < sels.length; j += 1) {
        var el = content.querySelector(sels[j]);
        if (el) {
          el.style.removeProperty("color");
        }
      }
    }
  }

  function applyTextToTargetSection(section, from, to, t) {
    if (!section || !colorTable || !colorTable[from] || !colorTable[to]) {
      return;
    }
    var c0 = colorTable[from];
    var c1 = colorTable[to];
    var a = t;
    var cTitle = lerpColor(c0.title, c1.title, a);
    var cBody = lerpColor(c0.body, c1.body, a);
    var cMeta = lerpColor(c0.meta, c1.meta, a);
    var content = section.querySelector(".section-header__content");
    if (!content) {
      return;
    }
    var tEl = content.querySelector("h2.section-title");
    var bEl = content.querySelector("p.prose.section-title");
    var mEl = content.querySelector("p.section-header__meta");
    if (tEl) {
      tEl.style.setProperty("color", rgbString(cTitle), "important");
    }
    if (bEl) {
      bEl.style.setProperty("color", rgbString(cBody), "important");
    }
    if (mEl) {
      mEl.style.setProperty("color", rgbString(cMeta), "important");
    }
  }

  function setBgLayers(st, from, to, tVal) {
    if (!st) {
      return;
    }
    var i;
    var list = st.querySelectorAll("[data-bg-layer]");
    for (i = 0; i < list.length; i += 1) {
      var el = list[i];
      var id = el.getAttribute("data-bg-layer");
      var o = layerOpacity(from, to, tVal, id);
      el.style.opacity = String(o);
    }
  }

  function setArtLayers(st, from, tVal, to) {
    if (!st) {
      return;
    }
    var list = st.querySelectorAll("[data-art-for]");
    var i;
    for (i = 0; i < list.length; i += 1) {
      var el = list[i];
      var id = el.getAttribute("data-art-for");
      var o = layerOpacity(from, to, tVal, id);
      el.style.opacity = String(o);
    }
  }

  function setSectionArt(sections, from, to, tVal) {
    var i;
    for (i = 0; i < sections.length; i += 1) {
      var id = sections[i].getAttribute("data-project");
      if (!id) {
        continue;
      }
      var o = layerOpacity(from, to, tVal, id);
      sections[i].style.setProperty("--project-art-opacity", String(o));
    }
  }

  function applyDocumentTheme(from, to, tVal) {
    var next = tVal < 0.5 ? headerThemeFor(from) : headerThemeFor(to);
    if (document.documentElement.getAttribute("data-header-theme") !== next) {
      document.documentElement.setAttribute("data-header-theme", next);
    }
  }

  function compute() {
    var sections = getProjects();
    if (sections.length === 0) {
      return;
    }
    var stSec = findDeepestStuck(sections);
    var from;
    var to;
    var tValue;

    if (stSec) {
      var stId = stSec.getAttribute("data-project");
      to = stId;
      from = prevId(to);
      if (lock.toId !== to) {
        lock = { toId: to, y0: window.scrollY };
      }
      if (reducedMotion) {
        tValue = 1;
      } else {
        tValue = clamp01((window.scrollY - lock.y0) / (window.innerHeight * 0.5));
      }
    } else {
      if (lock.y0 !== null && window.scrollY < lock.y0) {
        lock = { toId: null, y0: null };
      }
      var appr = findApproaching(sections);
      if (appr) {
        to = appr.getAttribute("data-project");
        from = prevId(to);
        tValue = 0;
      } else {
        var steady = findSteadyWhenPast(sections);
        if (steady) {
          to = steady;
          from = prevId(to);
          tValue = 1;
        } else {
          from = PRELUDE;
          to = "featured";
          tValue = 0;
        }
      }
    }

    lastPair = { from: from, to: to, t: tValue };

    var stage = document.querySelector(".project-background-stage");
    if (stage) {
      setBgLayers(stage, from, to, tValue);
      setArtLayers(stage, from, tValue, to);
    }
    setSectionArt(sections, from, to, tValue);

    var toSection = document.querySelector('section[data-project="' + to + '"]');
    if (toSection) {
      applyTextToTargetSection(toSection, from, to, tValue);
    }

    applyDocumentTheme(from, to, tValue);

    if (window.__portfolioProjectScrub) {
      window.__portfolioProjectScrub.lastPair = lastPair;
    }
  }

  function getProjects() {
    return Array.prototype.slice.call(document.querySelectorAll("section[data-project]"));
  }

  function onReduceMotion() {
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    schedule();
  }

  function runFrame() {
    raf = 0;
    if (!elMain) {
      return;
    }
    scrollW = window.innerHeight * 0.5;
    compute();
  }

  function schedule() {
    if (raf) {
      return;
    }
    raf = requestAnimationFrame(function () {
      raf = 0;
      runFrame();
    });
  }

  function onScroll() {
    schedule();
  }

  function onResize() {
    cacheColorTable();
    schedule();
  }

  function onMqLayout() {
    if (mql && mql.matches) {
      enable();
    } else {
      disable();
    }
  }

  function enable() {
    if (!mql || !mql.matches) {
      return;
    }
    if (scrollHandler) {
      schedule();
      return;
    }
    elMain = document.getElementById("main-content");
    buildRefMap();
    if (!refMap) {
      return;
    }
    cacheColorTable();
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("has-project-sticky-scrub");
    scrollHandler = onScroll;
    resizeHandler = onResize;
    reduceHandler = onReduceMotion;
    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("resize", resizeHandler, { passive: true });
    var red = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (red.addEventListener) {
      red.addEventListener("change", reduceHandler);
    }
    window.__portfolioProjectScrub = {
      getState: function () {
        return { pair: lastPair, lock: lock, scrollW: scrollW };
      }
    };
    schedule();
  }

  function disable() {
    document.documentElement.classList.remove("has-project-sticky-scrub");
    if (scrollHandler) {
      window.removeEventListener("scroll", scrollHandler);
      scrollHandler = null;
    }
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    var red = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceHandler && red.removeEventListener) {
      red.removeEventListener("change", reduceHandler);
    }
    reduceHandler = null;
    lock = { toId: null, y0: null };
    var sections = getProjects();
    clearSectionTextColors(sections);
    var i;
    for (i = 0; i < sections.length; i += 1) {
      sections[i].style.removeProperty("--project-art-opacity");
    }
    var st = document.querySelector(".project-background-stage");
    if (st) {
      var bgs = st.querySelectorAll("[data-bg-layer]");
      var a;
      for (a = 0; a < bgs.length; a += 1) {
        bgs[a].style.removeProperty("opacity");
      }
      var ar = st.querySelectorAll("[data-art-for]");
      for (a = 0; a < ar.length; a += 1) {
        ar[a].style.removeProperty("opacity");
      }
    }
    raf = 0;
  }

  function init() {
    mql = window.matchMedia(MQ);
    if (!document.querySelector(".project-background-stage")) {
      return;
    }
    mql.addEventListener("change", onMqLayout);
    onMqLayout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
