/**
 * Top 2019 case hero: stage scale for numeral strip animation.
 * @see docs/top2019-hero-illustration-handoff.md
 */
(function () {
  var STAGE_W = 1024;
  var STAGE_H = 672;

  function setStageScale(root) {
    var rect = root.getBoundingClientRect();
    var w = rect.width || STAGE_W;
    var h = rect.height || STAGE_H;
    var scale = Math.max(w / STAGE_W, h / STAGE_H);
    root.style.setProperty("--stage-scale", scale.toFixed(5));
  }

  function bind(root) {
    var ro;
    var onResize = function () {
      setStageScale(root);
    };

    setStageScale(root);
    window.addEventListener("resize", onResize, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize, { passive: true });
    }
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(root);
    }

    window.addEventListener(
      "pageshow",
      function (event) {
        if (event.persisted) {
          setStageScale(root);
        }
      },
      { passive: true }
    );
  }

  document.querySelectorAll("[data-top2019-hero]").forEach(function (root) {
    setStageScale(root);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.setAttribute("data-reduced-motion", "true");
      return;
    }
    bind(root);
  });
})();
