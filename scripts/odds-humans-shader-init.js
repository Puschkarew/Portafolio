/**
 * Mount humans-shader into the shared Odds stage. The in-section root remains
 * as a no-JS/local fallback, but scrub mode owns the live shader on all widths.
 */
(function () {
  var instance = null;

  function getRoot() {
    return document.getElementById("humans-shader-stage") || document.getElementById("humans-shader");
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
    var other = root.id === "humans-shader-stage"
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

  function onReady() {
    mount();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady, { once: true });
  } else {
    onReady();
  }
})();
