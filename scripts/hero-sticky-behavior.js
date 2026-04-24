/**
 * Tall hero: keep the section sticky, but offset it upward by the exact overflow.
 * That lets the user scroll through the full hero until its bottom reaches the
 * viewport bottom; only then can the following content slide over it.
 */
(function () {
  var HERO_SELECTOR = ".section--hero";
  var TALL = "data-hero-tall";
  var STICKY_TOP = "--hero-sticky-top";
  var root = null;
  var hero = null;
  var ro = null;
  var raf = 0;

  function viewportHeight() {
    return (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  }

  function heroHeight() {
    return hero ? hero.getBoundingClientRect().height : 0;
  }

  function apply() {
    if (!root || !hero) {
      return;
    }

    var height = heroHeight();
    var viewport = viewportHeight();
    if (height > viewport + 1) {
      root.setAttribute(TALL, "");
      root.style.setProperty(STICKY_TOP, Math.min(0, viewport - height) + "px");
    } else {
      root.removeAttribute(TALL);
      root.style.removeProperty(STICKY_TOP);
    }
  }

  function schedule() {
    if (raf) {
      return;
    }
    raf = requestAnimationFrame(function () {
      raf = 0;
      apply();
    });
  }

  function bind() {
    if (typeof ResizeObserver !== "undefined" && !ro) {
      ro = new ResizeObserver(function () {
        schedule();
      });
      ro.observe(hero);
    }
    window.addEventListener("resize", schedule);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", schedule);
    }
  }

  function init() {
    root = document.documentElement;
    hero = document.querySelector(HERO_SELECTOR);
    if (!root || !hero) {
      return;
    }
    bind();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        schedule();
      });
    }
    schedule();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
