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
    var strip = root.querySelector(".top2019-strip");
    var imageReady = !strip || strip.complete;
    var windowReady = document.readyState === "complete";
    var started = false;
    var onResize = function () {
      setStageScale(root);
    };
    var start = function () {
      if (started || !imageReady || !windowReady) {
        return;
      }
      started = true;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          root.classList.add("is-ready");
        });
      });
    };
    var onImageReady = function () {
      imageReady = true;
      start();
    };
    var onWindowReady = function () {
      windowReady = true;
      start();
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
          root.classList.remove("is-ready");
          started = false;
          imageReady = !strip || strip.complete;
          windowReady = true;
          setStageScale(root);
          start();
        }
      },
      { passive: true }
    );

    if (strip && typeof strip.decode === "function") {
      strip.decode().then(onImageReady).catch(onImageReady);
    } else if (strip && !strip.complete) {
      strip.addEventListener("load", onImageReady, { once: true });
      strip.addEventListener("error", onImageReady, { once: true });
    } else {
      onImageReady();
    }

    if (windowReady) {
      start();
    } else {
      window.addEventListener("load", onWindowReady, { once: true });
    }
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
