/**
 * Header: exact rail pinning, fixed glass (backdrop-filter) layer, fixed visual
 * text clones (mix-blend-mode: difference), and fixed transparent hitbox links.
 */
(function () {
  var HEADER_SELECTOR = ".site-header";
  var MOVING_RAIL_SELECTOR = ".site-header__menu";
  var GLASS_SOURCES = [
    { name: "project", selector: ".site-header__project" },
    { name: "nav", selector: ".site-header__nav" },
    { name: "contact", selector: ".site-header__contact" },
    { name: "mobile", selector: ".site-header__mobile-trigger" }
  ];

  var headerEl = null;
  var movingRailEl = null;
  var projectRailEl = null;
  var resizeRaf = 0;
  var pinRaf = 0;
  var geometryRaf = 0;
  var appliedTop = null;
  var topStep = 1;
  var glassItemsByName = Object.create(null);
  var textPairs = [];
  var linkPairs = [];
  var glassResizeObserver = null;

  function updateTopStep() {
    topStep = 1 / (window.devicePixelRatio || 1);
  }

  function quantize(value) {
    return Math.round(value / topStep) * topStep;
  }

  function currentScrollTop() {
    return quantize(window.scrollY || window.pageYOffset || 0);
  }

  function cacheElements() {
    headerEl = document.querySelector(HEADER_SELECTOR);
    movingRailEl = document.querySelector(MOVING_RAIL_SELECTOR);
    projectRailEl = headerEl ? headerEl.querySelector(".site-header__project") : null;
  }

  function writeTop(top) {
    if (!movingRailEl) return;
    var nextTop = quantize(top);
    var zeroSafeTop = Math.abs(nextTop) < topStep / 2 ? 0 : nextTop;
    movingRailEl.style.top = zeroSafeTop + "px";
    if (projectRailEl) projectRailEl.style.top = zeroSafeTop + "px";
    appliedTop = zeroSafeTop;
  }

  function setGlassItemRect(glassItem, rect) {
    if (!glassItem) return;
    if (rect.width <= 0 || rect.height <= 0) {
      glassItem.style.display = "none";
      return;
    }
    glassItem.style.display = "block";
    glassItem.style.left = quantize(rect.left) + "px";
    glassItem.style.top = quantize(rect.top) + "px";
    glassItem.style.width = quantize(rect.width) + "px";
    glassItem.style.height = quantize(rect.height) + "px";
  }

  function setVisualTextRect(span, rect) {
    if (!span) return;
    if (rect.width <= 0 || rect.height <= 0) {
      span.style.display = "none";
      return;
    }
    span.style.display = "inline-block";
    span.style.left = quantize(rect.left) + "px";
    span.style.top = quantize(rect.top) + "px";
    span.style.width = quantize(rect.width) + "px";
    span.style.height = quantize(rect.height) + "px";
  }

  function setHitLinkRect(anchor, rect) {
    if (!anchor) return;
    if (rect.width <= 0 || rect.height <= 0) {
      anchor.style.display = "none";
      return;
    }
    anchor.style.display = "block";
    anchor.style.left = quantize(rect.left) + "px";
    anchor.style.top = quantize(rect.top) + "px";
    anchor.style.width = quantize(rect.width) + "px";
    anchor.style.height = quantize(rect.height) + "px";
  }

  function syncGlassGeometry() {
    var i;
    var g;
    var src;
    for (i = 0; i < GLASS_SOURCES.length; i += 1) {
      g = GLASS_SOURCES[i];
      src = headerEl ? headerEl.querySelector(g.selector) : null;
      if (!src) {
        setGlassItemRect(glassItemsByName[g.name], { width: 0, height: 0 });
        continue;
      }

      var srcRect = src.getBoundingClientRect();
      var nextWidth = srcRect.width;
      if (g.name === "project") {
        var overflowRight = Math.max(0, (src.scrollWidth || 0) - (src.clientWidth || 0));
        var srcStyles = window.getComputedStyle ? getComputedStyle(src) : null;
        var padR = srcStyles ? parseFloat(srcStyles.paddingRight) || 0 : 0;
        nextWidth = srcRect.width + overflowRight + (overflowRight > 0 ? padR : 0);
      }

      var nextRect = {
        left: srcRect.left,
        top: srcRect.top,
        width: nextWidth,
        height: srcRect.height
      };

      setGlassItemRect(glassItemsByName[g.name], nextRect);
    }
  }

  function syncVisualTextGeometry() {
    var i;
    var pair;
    for (i = 0; i < textPairs.length; i += 1) {
      pair = textPairs[i];
      if (!pair.source || !pair.clone) continue;
      setVisualTextRect(pair.clone, pair.source.getBoundingClientRect());
    }
  }

  function syncHitGeometry() {
    var i;
    var pair;
    for (i = 0; i < linkPairs.length; i += 1) {
      pair = linkPairs[i];
      if (!pair.source || !pair.clone) continue;
      if (pair.source.getAttribute("href") !== pair.clone.getAttribute("href")) {
        pair.clone.setAttribute("href", pair.source.getAttribute("href") || "#");
      }
      var sourceRect = pair.source.getBoundingClientRect();
      var sourceScrollWidth = pair.source.scrollWidth || 0;
      var nextRect = {
        left: sourceRect.left,
        top: sourceRect.top,
        width: Math.max(sourceRect.width, sourceScrollWidth),
        height: sourceRect.height
      };

      setHitLinkRect(pair.clone, nextRect);
    }
  }

  function syncAllGeometry() {
    syncGlassGeometry();
    syncVisualTextGeometry();
    syncHitGeometry();
  }

  function scheduleGeometryFrame() {
    if (geometryRaf) return;
    geometryRaf = requestAnimationFrame(function () {
      geometryRaf = 0;
      syncAllGeometry();
    });
  }

  function buildGlassItemRefs() {
    var i;
    var n;
    glassItemsByName = Object.create(null);
    for (i = 0; i < GLASS_SOURCES.length; i += 1) {
      n = GLASS_SOURCES[i].name;
      glassItemsByName[n] = document.querySelector(
        '.site-header-glass [data-header-glass-item="' + n + '"]'
      );
    }
  }

  function buildOverlayNodes() {
    if (!headerEl) return;
    var existingTextLayer = headerEl.querySelector(".site-header__visual-text-layer");
    var existingHitLayer = headerEl.querySelector(".site-header__hit-layer");
    if (existingTextLayer) existingTextLayer.remove();
    if (existingHitLayer) existingHitLayer.remove();

    var textLayer = document.createElement("div");
    textLayer.className = "site-header__visual-text-layer";
    textLayer.setAttribute("aria-hidden", "true");
    var hitLayer = document.createElement("div");
    hitLayer.className = "site-header__hit-layer";
    hitLayer.setAttribute("aria-hidden", "true");

    var sourceTexts = headerEl.querySelectorAll(".site-header__text");
    textPairs = [];
    var t;
    var span;
    for (t = 0; t < sourceTexts.length; t += 1) {
      span = document.createElement("span");
      span.className = "site-header__visual-text";
      span.textContent = sourceTexts[t].textContent;
      textLayer.appendChild(span);
      textPairs.push({ source: sourceTexts[t], clone: span });
    }

    var sourceLinks = headerEl.querySelectorAll(
      "a.site-header__project, a.site-header__link, a.site-header__contact, a.site-header__mobile-trigger"
    );
    linkPairs = [];
    var h;
    var a;
    for (h = 0; h < sourceLinks.length; h += 1) {
      a = document.createElement("a");
      a.className = "site-header__hit-link";
      a.href = sourceLinks[h].getAttribute("href") || "#";
      a.setAttribute("aria-hidden", "true");
      a.tabIndex = -1;
      hitLayer.appendChild(a);
      linkPairs.push({ source: sourceLinks[h], clone: a });
    }

    headerEl.appendChild(textLayer);
    headerEl.appendChild(hitLayer);
    document.documentElement.classList.add("has-header-visual-text");
  }

  function attachGeometryResizeObserver() {
    if (glassResizeObserver) {
      glassResizeObserver.disconnect();
      glassResizeObserver = null;
    }
    if (!headerEl || typeof ResizeObserver === "undefined") return;
    glassResizeObserver = new ResizeObserver(function () {
      scheduleGeometryFrame();
    });
    glassResizeObserver.observe(headerEl);
  }

  function pinHeader() {
    writeTop(currentScrollTop());
  }

  function onScroll() {
    if (pinRaf) {
      cancelAnimationFrame(pinRaf);
      pinRaf = 0;
    }
    pinHeader();
  }

  function onResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () {
      resizeRaf = 0;
      refreshLayout();
    });
  }

  function refreshLayout() {
    updateTopStep();
    writeTop(currentScrollTop());
    scheduleGeometryFrame();
  }

  function init() {
    cacheElements();
    buildGlassItemRefs();
    buildOverlayNodes();
    updateTopStep();
    writeTop(currentScrollTop());
    attachGeometryResizeObserver();
    scheduleGeometryFrame();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        scheduleGeometryFrame();
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    window.__portfolioHeaderMotion = {
      getParams: function getParams() {
        return {
          mode: "exact",
          appliedTop: appliedTop,
          topStep: topStep
        };
      },
      setParams: function setParams() {
        refreshLayout();
        return this.getParams();
      },
      resetParams: function resetParams() {
        return this.setParams();
      },
      syncGeometry: function syncGeometry() {
        scheduleGeometryFrame();
        return this.getParams();
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
