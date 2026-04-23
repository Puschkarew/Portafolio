(function () {
  var root = document.querySelector("[data-motion-lab]");
  var frame = document.querySelector("[data-preview-frame]");
  var statusEl = document.querySelector("[data-status]");
  var readoutRoot = document.querySelector("[data-readout]");

  if (!root || !frame) {
    return;
  }

  function setStatus(message) {
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function getApi(win) {
    return win && win.__portfolioHeaderMotion ? win.__portfolioHeaderMotion : null;
  }

  function updateReadout(params) {
    if (!readoutRoot || !params) return;
    var keys = ["mode", "appliedTop", "topStep"];
    for (var i = 0; i < keys.length; i += 1) {
      var k = keys[i];
      var el = readoutRoot.querySelector('[data-field="' + k + '"]');
      if (!el) continue;
      var v = params[k];
      if (v == null) {
        el.textContent = "—";
        continue;
      }
      el.textContent = typeof v === "number" && !Number.isInteger(v) ? v.toFixed(6) : String(v);
    }
  }

  function connectToFrame() {
    var win = frame.contentWindow;
    var api = getApi(win);

    if (!api) {
      return false;
    }

    var current = api.getParams();
    updateReadout(current);
    setStatus("Connected. Use Sync geometry to force overlay resync in the preview.");

    return true;
  }

  function waitForApi(attempt) {
    var nextAttempt = typeof attempt === "number" ? attempt : 0;

    if (connectToFrame()) {
      return;
    }

    if (nextAttempt > 80) {
      setStatus(
        "Could not connect to __portfolioHeaderMotion API inside the iframe. " +
          "Open the console in the embedded page and confirm scripts/header-theme.js is loading."
      );
      return;
    }

    window.setTimeout(function () {
      waitForApi(nextAttempt + 1);
    }, 50);
  }

  function onCopyClick() {
    var win = frame.contentWindow;
    var api = getApi(win);
    if (!api) {
      setStatus("Not connected yet…");
      return;
    }

    var json = JSON.stringify(api.getParams(), null, 2);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(
        function () {
          setStatus("Copied current parameters JSON to clipboard.");
        },
        function () {
          setStatus("Copy failed. JSON printed to console instead.");
          console.log(json);
        }
      );
      return;
    }

    setStatus("Clipboard API not available. JSON printed to console instead.");
    console.log(json);
  }

  function onSyncClick() {
    var win = frame.contentWindow;
    var api = getApi(win);
    if (!api) {
      setStatus("Not connected yet…");
      return;
    }

    if (typeof api.syncGeometry === "function") {
      var next = api.syncGeometry();
      updateReadout(next);
      setStatus("syncGeometry() ran on the preview.");
      return;
    }

    setStatus("API has no syncGeometry().");
  }

  function onScrollIframe() {
    var win = frame.contentWindow;
    var api = getApi(win);
    if (!api) return;
    updateReadout(api.getParams());
  }

  var copyButton = root.querySelector('[data-action="copy"]');
  var syncButton = root.querySelector('[data-action="sync"]');

  if (copyButton) {
    copyButton.addEventListener("click", onCopyClick);
  }

  if (syncButton) {
    syncButton.addEventListener("click", onSyncClick);
  }

  if (frame.addEventListener) {
    frame.addEventListener("load", function () {
      setStatus("Preview loaded. Connecting to header API…");
      waitForApi(0);
      try {
        var w = frame.contentWindow;
        if (w) {
          w.addEventListener("scroll", onScrollIframe, { passive: true });
        }
      } catch (e) {
        /* cross-origin: ignore */
      }
    });
  }
})();
