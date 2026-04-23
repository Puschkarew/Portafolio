document.addEventListener("DOMContentLoaded", function () {
  const root = document.getElementById("humans-shader");
  if (!root || typeof window.initHumansShader !== "function") {
    return;
  }
  window.initHumansShader(root, {
    showPanel: false,
    persistConfig: false,
    assetBaseUrl: "assets/humans-shader/"
  });
});
