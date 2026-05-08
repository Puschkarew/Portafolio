/**
 * Rewrites footer "Site build …" visible text from <time datetime> using the viewer's locale timezone.
 */
(function () {
  var SELECTOR = "#contact-details time[data-site-build-time]"

  /** @param {Date} date */
  function formatSiteBuildLabelLocal(date) {
    var dtf = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      hourCycle: "h23"
    })
    var parts = dtf.formatToParts(date)
    var byType = Object.create(null)
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i]
      if (p.type !== "literal") byType[p.type] = p.value
    }
    var day = byType.day || ""
    var month = byType.month || ""
    var year = byType.year || ""
    var hour = byType.hour || ""
    var minute = byType.minute || ""
    return "Site build " + day + " " + month + " " + year + " at " + hour + ":" + minute
  }

  function init() {
    var el = document.querySelector(SELECTOR)
    if (!el) return
    var iso = el.getAttribute("datetime")
    if (!iso) return
    var parsed = new Date(iso)
    if (Number.isNaN(parsed.getTime())) return
    el.textContent = formatSiteBuildLabelLocal(parsed)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
    return
  }
  init()
})()
