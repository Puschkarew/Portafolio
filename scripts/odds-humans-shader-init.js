/**
 * Mount humans-shader into the Odds stage on desktop (#humans-shader-stage) or
 * the in-section fallback (#humans-shader) on smaller viewports.
 */
(function () {
  var MQ = "(min-width: 1024px)";
  var mql = window.matchMedia(MQ);
  var instance = null;

  function getRoot() {
    return mql.matches
      ? document.getElementById("humans-shader-stage")
      : document.getElementById("humans-shader");
  }

  function mount() {
    if (typeof window.initHumansShader !== "function") {
      return;
    }
    var root = getRoot();
    if (!root) {
      return;
    }
    if (instance && typeof instance.destroy === "function") {
      instance.destroy();
      instance = null;
    }
    var other = mql.matches
      ? document.getElementById("humans-shader")
      : document.getElementById("humans-shader-stage");
    if (other) {
      other.textContent = "";
    }
    root.textContent = "";
    instance = window.initHumansShader(root, {
      showPanel: false,
      persistConfig: false,
      assetBaseUrl: "assets/humans-shader/"
    });
  }

  function onMqlChange() {
    mount();
  }

  function onReady() {
    mount();
    if (mql.addEventListener) {
      mql.addEventListener("change", onMqlChange);
    } else if (mql.addListener) {
      mql.addListener(onMqlChange);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }
})();
