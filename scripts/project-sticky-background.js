/**
 * Sticky project stage: scroll progress t drives bg, art blur, and text.
 * @see artifacts/project-sticky-transition-blur-handoff-2026-04-24.md
 */
(function () {
  var PRELUDE = "prelude";
  var TRANSITION_RATIO = 0.5;
  var ART_MAX_BLUR_PX = 32;

  var raf = 0;
  var elProjectsArea = null;
  var refMap = null;
  var colorTable = null;
  var projectRows = null;
  var projectOrder = [];
  var lastPair = { from: PRELUDE, to: "featured", t: 0 };
  var lastDisplayId = "featured";
  var lastMode = "disabled";
  var lastTransitionPx = 0;
  var lastProjectsSnapshot = [];
  var reducedMotion = false;
  var scrollHandler = null;
  var resizeHandler = null;
  var reduceHandler = null;
  var pageshowHandler = null;
  var loadSyncHandler = null;

  var DETACH_SCROLL_SLACK = 2;
  var DETACH_BOTTOM_IN = 1;
  var DETACH_BOTTOM_OUT = 4;

  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }

  function mix(a, b, t) {
    return a + (b - a) * t;
  }

  function parseRgb(colorStr) {
    if (!colorStr) {
      return { r: 0, g: 0, b: 0 };
    }
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
    var i = projectOrder.indexOf(id);
    if (i <= 0) {
      return PRELUDE;
    }
    return projectOrder[i - 1];
  }

  function layerOpacity(id, pair) {
    var t = pair.t;
    var from = pair.from;
    var to = pair.to;
    return (from === id ? 1 - t : 0) + (to === id ? t : 0);
  }

  function artBlur(id, pair) {
    var t = pair.t;
    if (pair.from === id) {
      return ART_MAX_BLUR_PX * t;
    }
    if (pair.to === id) {
      return ART_MAX_BLUR_PX * (1 - t);
    }
    return ART_MAX_BLUR_PX;
  }

  function round3(x) {
    return Math.round(x * 1000) / 1000;
  }

  function currentMode() {
    return window.innerWidth < 1024 ? "mobile" : "desktop";
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
    var keys = [PRELUDE].concat(projectOrder);
    var k;
    for (k = 0; k < keys.length; k += 1) {
      if (refMap && refMap[keys[k]]) {
        out[keys[k]] = buildColorRowFromRef(refMap[keys[k]]);
      }
    }
    colorTable = out;
  }

  function buildRefMap() {
    var root = document.querySelector(".project-color-refs");
    if (!root) {
      refMap = null;
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

  function cacheProjectRows() {
    var root = document.querySelector(".projects-area");
    if (!root) {
      projectRows = [];
      projectOrder = [];
      return;
    }
    var list = root.querySelectorAll("section[data-project]");
    var i;
    var out = [];
    for (i = 0; i < list.length; i += 1) {
      var section = list[i];
      var id = section.getAttribute("data-project");
      var header = section.querySelector(".section-header");
      if (!id || !header) {
        continue;
      }
      out.push({
        id: id,
        section: section,
        startScrollY: 0
      });
    }
    projectRows = out;
    projectOrder = out.map(function (row) {
      return row.id;
    });
    recomputeStartScrollY();
  }

  function recomputeStartScrollY() {
    if (!projectRows) {
      return;
    }
    var i;
    for (i = 0; i < projectRows.length; i += 1) {
      var row = projectRows[i];
      var s = row.section;
      var r = s.getBoundingClientRect();
      /* Stable document Y of the section; sticky header geometry changes after footer reload. */
      row.startScrollY = r.top + window.scrollY;
    }
  }

  function tForWindow(scrollY, s, transitionPx, isRm) {
    if (scrollY < s) {
      return 0;
    }
    if (scrollY >= s + transitionPx) {
      return 1;
    }
    if (isRm) {
      return 1;
    }
    return (scrollY - s) / transitionPx;
  }

  /**
   * Pairs: i=0 prelude->first project, 1 first->second, ...
   * S[i] = startScrollY for projectRows[i].
   */
  function pairFromScroll(scrollY, transitionPx, isRm) {
    if (!projectRows || projectRows.length === 0) {
      return { from: PRELUDE, to: "featured", t: 0, displayId: "featured" };
    }
    var S = projectRows;
    var T = transitionPx;
    var firstId = S[0].id;
    var i;

    if (scrollY < S[0].startScrollY) {
      return { from: PRELUDE, to: firstId, t: 0, displayId: firstId };
    }

    for (i = 0; i < S.length; i += 1) {
      var current = S[i];
      var from = i === 0 ? PRELUDE : S[i - 1].id;
      var to = current.id;
      var next = S[i + 1];

      if (scrollY < current.startScrollY + T) {
        return {
          from: from,
          to: to,
          t: tForWindow(scrollY, current.startScrollY, T, isRm),
          displayId: to
        };
      }

      if (next && scrollY < next.startScrollY) {
        return { from: to, to: next.id, t: 0, displayId: next.id };
      }
    }

    var last = S[S.length - 1].id;
    return { from: prevId(last), to: last, t: 1, displayId: last };
  }

  function canEvaluateDetach() {
    return Boolean(elProjectsArea && projectRows && projectRows.length > 0);
  }

  function shouldDetach(scrollY, transitionPx) {
    if (!canEvaluateDetach()) {
      return false;
    }
    var last = projectRows[projectRows.length - 1];
    if (scrollY < last.startScrollY + transitionPx) {
      return false;
    }
    var b = elProjectsArea.getBoundingClientRect().bottom;
    return b <= window.innerHeight + DETACH_BOTTOM_IN;
  }

  function shouldUnDetach(scrollY, transitionPx) {
    if (!canEvaluateDetach()) {
      return true;
    }
    var last = projectRows[projectRows.length - 1];
    if (scrollY < last.startScrollY + transitionPx - DETACH_SCROLL_SLACK) {
      return true;
    }
    var b = elProjectsArea.getBoundingClientRect().bottom;
    return b > window.innerHeight + DETACH_BOTTOM_OUT;
  }

  function clearSectionTextColors() {
    if (!projectRows) {
      return;
    }
    var i;
    for (i = 0; i < projectRows.length; i += 1) {
      projectRows[i].section.style.removeProperty("--section-title-color");
      projectRows[i].section.style.removeProperty("--section-body-color");
      projectRows[i].section.style.removeProperty("--section-meta-color");
    }
  }

  function applyTextToSection(section, from, to, t) {
    if (!section || !colorTable || !colorTable[from] || !colorTable[to]) {
      return;
    }
    var c0 = colorTable[from];
    var c1 = colorTable[to];
    var a = t;
    var cTitle = lerpColor(c0.title, c1.title, a);
    var cBody = lerpColor(c0.body, c1.body, a);
    var cMeta = lerpColor(c0.meta, c1.meta, a);
    section.style.setProperty("--section-title-color", rgbString(cTitle));
    section.style.setProperty("--section-body-color", rgbString(cBody));
    section.style.setProperty("--section-meta-color", rgbString(cMeta));
  }

  function applyStage(pair) {
    var stage = document.querySelector(".project-background-stage");
    if (!stage) {
      return;
    }
    var bgs = stage.querySelectorAll("[data-bg-layer]");
    var ars = stage.querySelectorAll("[data-art-for]");
    var i;
    for (i = 0; i < bgs.length; i += 1) {
      var bg = bgs[i];
      var id = bg.getAttribute("data-bg-layer");
      bg.style.opacity = String(layerOpacity(id, pair));
    }
    for (i = 0; i < ars.length; i += 1) {
      var ar = ars[i];
      var id = ar.getAttribute("data-art-for");
      ar.style.opacity = String(layerOpacity(id, pair));
      ar.style.setProperty("--project-art-blur", round3(artBlur(id, pair)) + "px");
    }
  }

  function getTargetSectionByDisplay(displayId) {
    return document.querySelector('.projects-area section[data-project="' + displayId + '"]');
  }

  function compute() {
    var transitionPx = window.innerHeight * TRANSITION_RATIO;
    lastTransitionPx = transitionPx;
    recomputeStartScrollY();
    if (projectRows && projectRows.length) {
      lastProjectsSnapshot = projectRows.map(function (r) {
        return { id: r.id, startY: r.startScrollY };
      });
    }

    var isRm = reducedMotion;
    if (!elProjectsArea || !projectRows || projectRows.length === 0) {
      return;
    }

    var y = window.scrollY;
    var rootEl = document.documentElement;
    var wasDetached = rootEl.classList.contains("is-project-stage-detached");
    if (wasDetached) {
      if (shouldUnDetach(y, transitionPx)) {
        rootEl.classList.remove("is-project-stage-detached");
        /* Must reset before the attached-path applyStage in this same tick, or one frame
           can show the previous inline stack when the shell becomes visible again. */
        clearStageInline();
      }
    } else if (shouldDetach(y, transitionPx)) {
      rootEl.classList.add("is-project-stage-detached");
      clearStageInline();
    }

    if (document.documentElement.classList.contains("is-project-stage-detached")) {
      clearSectionTextColors();
      var lastProjectId = projectRows[projectRows.length - 1].id;
      lastPair = { from: prevId(lastProjectId), to: lastProjectId, t: 1 };
      lastDisplayId = lastProjectId;
      lastMode = currentMode();
      return;
    }

    var p = pairFromScroll(y, transitionPx, isRm);
    p.t = clamp01(p.t);
    lastPair = { from: p.from, to: p.to, t: p.t };
    lastDisplayId = p.displayId;
    lastMode = currentMode();

    applyStage(lastPair);
    var target = getTargetSectionByDisplay(p.displayId);
    if (target) {
      clearSectionTextColors();
      applyTextToSection(target, p.from, p.to, p.t);
    }
  }

  function runFrame() {
    raf = 0;
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
    cacheProjectRows();
    cacheColorTable();
    schedule();
  }

  function onReduceMotion() {
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    schedule();
  }

  /**
   * After `load`, double rAF, or bfcache `pageshow`, layout + restored scrollY match
   * reality. Without this, first paint can run with scrollY=0, applyStage "locks" wrong
   * layer inlines, then the shell is hidden in detached — but on scroll-up the stale
   * inlines reappear and cause a split (footer + wrong project art) until the next frame.
   */
  function syncStateAfterLayout() {
    if (!scrollHandler) {
      return;
    }
    cacheProjectRows();
    cacheColorTable();
    schedule();
  }

  function enable() {
    if (!document.querySelector(".project-background-stage") || !document.querySelector(".projects-area")) {
      return;
    }
    if (scrollHandler) {
      schedule();
      return;
    }
    buildRefMap();
    if (!refMap || !refMap[PRELUDE] || !refMap["featured"]) {
      return;
    }
    elProjectsArea = document.querySelector(".projects-area");
    cacheProjectRows();
    if (!projectRows || projectRows.length === 0) {
      return;
    }
    reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("has-project-sticky-scrub");
    cacheColorTable();
    scrollHandler = onScroll;
    resizeHandler = onResize;
    reduceHandler = onReduceMotion;
    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("resize", resizeHandler, { passive: true });
    pageshowHandler = function () {
      syncStateAfterLayout();
    };
    window.addEventListener("pageshow", pageshowHandler);
    loadSyncHandler = function () {
      syncStateAfterLayout();
    };
    if (document.readyState === "complete") {
      loadSyncHandler();
    } else {
      window.addEventListener("load", loadSyncHandler, { once: true });
    }
    setTimeout(function () {
      syncStateAfterLayout();
    }, 0);
    setTimeout(function () {
      syncStateAfterLayout();
    }, 50);
    var red = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (red.addEventListener) {
      red.addEventListener("change", reduceHandler);
    }
    lastMode = currentMode();
    window.__portfolioProjectScrub = {
      getState: function () {
        return {
          pair: { from: lastPair.from, to: lastPair.to, t: lastPair.t },
          displayId: lastDisplayId,
          mode: lastMode,
          transitionPx: lastTransitionPx,
          projects: lastProjectsSnapshot.slice()
        };
      }
    };
    schedule();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        syncStateAfterLayout();
      });
    });
  }

  function clearStageInline() {
    var st = document.querySelector(".project-background-stage");
    if (!st) {
      return;
    }
    var bgs = st.querySelectorAll("[data-bg-layer], .project-background-layer--base");
    var i;
    for (i = 0; i < bgs.length; i += 1) {
      bgs[i].style.removeProperty("opacity");
    }
    var ars = st.querySelectorAll("[data-art-for]");
    for (i = 0; i < ars.length; i += 1) {
      ars[i].style.removeProperty("opacity");
      ars[i].style.removeProperty("--project-art-blur");
    }
  }

  function disable() {
    document.documentElement.classList.remove("has-project-sticky-scrub");
    document.documentElement.classList.remove("is-project-stage-detached");
    lastMode = "disabled";
    if (pageshowHandler) {
      window.removeEventListener("pageshow", pageshowHandler);
      pageshowHandler = null;
    }
    if (loadSyncHandler) {
      window.removeEventListener("load", loadSyncHandler);
      loadSyncHandler = null;
    }
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
    clearSectionTextColors();
    clearStageInline();
    raf = 0;
  }

  function init() {
    enable();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
