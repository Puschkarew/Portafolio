/**
 * Mobile menu overlay:
 * - opens from both the source link and the fixed hit-link clone
 * - hides header layers via html.is-mobile-menu-open (CSS)
 * - locks scroll while open
 */
(function () {
  var OPEN_CLASS = "is-mobile-menu-open"
  var VISUAL_TEXT_CLASS = "has-mobile-menu-visual-text"
  var TRIGGER_SELECTOR = ".site-header__mobile-trigger"
  var MENU_SELECTOR = ".mobile-menu"
  var CLOSE_SELECTOR = ".mobile-menu__close"
  var LINK_SELECTOR = ".mobile-menu__link"
  var VISUAL_SOURCE_SELECTOR = ".mobile-menu__close-text, .mobile-menu__link"

  var menuEl = null
  var closeButtonEl = null
  var sourceTriggerEl = null
  var hitTriggerEl = null
  var lastFocusedEl = null
  var visualTextLayerEl = null
  var visualTextPairs = []
  var geometryRaf = 0

  function getHitCloneForMobileTrigger() {
    var headerEl = document.querySelector(".site-header")
    if (!headerEl) return null

    var hitLayerEl = headerEl.querySelector(".site-header__hit-layer")
    if (!hitLayerEl) return null

    var namedHit = hitLayerEl.querySelector('a.site-header__hit-link[data-header-hit-source="mobile-trigger"]')
    if (namedHit) return namedHit

    var sourceLinks = headerEl.querySelectorAll(
      "a.site-header__project, a.site-header__link, a.site-header__contact, a.site-header__mobile-trigger"
    )
    var hitLinks = hitLayerEl.querySelectorAll("a.site-header__hit-link")
    if (!sourceLinks.length || !hitLinks.length) return null

    var i
    for (i = 0; i < sourceLinks.length; i += 1) {
      if (sourceLinks[i].matches(TRIGGER_SELECTOR)) return hitLinks[i] || null
    }
    return null
  }

  function quantize(value) {
    var step = 1 / (window.devicePixelRatio || 1)
    return Math.round(value / step) * step
  }

  function copyTextStyles(source, clone) {
    var styles = getComputedStyle(source)
    clone.style.fontFamily = styles.fontFamily
    clone.style.fontWeight = styles.fontWeight
    clone.style.fontSize = styles.fontSize
    clone.style.lineHeight = styles.lineHeight
    clone.style.letterSpacing = styles.letterSpacing
    clone.style.textAlign = styles.textAlign
  }

  function setVisualTextRect(clone, rect) {
    if (!clone) return
    if (rect.width <= 0 || rect.height <= 0) {
      clone.style.display = "none"
      return
    }

    clone.style.display = "block"
    clone.style.left = quantize(rect.left) + "px"
    clone.style.top = quantize(rect.top) + "px"
    clone.style.width = quantize(rect.width) + "px"
    clone.style.height = quantize(rect.height) + "px"
  }

  function syncVisualTextGeometry() {
    var i
    var pair

    for (i = 0; i < visualTextPairs.length; i += 1) {
      pair = visualTextPairs[i]
      if (!pair.source || !pair.clone) continue
      copyTextStyles(pair.source, pair.clone)
      setVisualTextRect(pair.clone, pair.source.getBoundingClientRect())
    }
  }

  function hideVisualText() {
    var i
    for (i = 0; i < visualTextPairs.length; i += 1) {
      if (visualTextPairs[i].clone) visualTextPairs[i].clone.style.display = "none"
    }
  }

  function scheduleGeometryFrame() {
    if (!isOpen() || geometryRaf) return
    geometryRaf = requestAnimationFrame(function () {
      geometryRaf = 0
      syncVisualTextGeometry()
    })
  }

  function buildVisualTextLayer() {
    if (!menuEl || visualTextLayerEl) return

    visualTextLayerEl = document.createElement("div")
    visualTextLayerEl.className = "mobile-menu__visual-text-layer"
    visualTextLayerEl.setAttribute("aria-hidden", "true")

    var sourceTexts = menuEl.querySelectorAll(VISUAL_SOURCE_SELECTOR)
    var i
    var span

    for (i = 0; i < sourceTexts.length; i += 1) {
      span = document.createElement("span")
      span.className = "mobile-menu__visual-text"
      span.textContent = sourceTexts[i].textContent
      visualTextLayerEl.appendChild(span)
      visualTextPairs.push({ source: sourceTexts[i], clone: span })
    }

    menuEl.parentNode.insertBefore(visualTextLayerEl, menuEl.nextSibling)
    document.documentElement.classList.add(VISUAL_TEXT_CLASS)
  }

  function setHidden(el, hidden) {
    if (!el) return
    if (hidden) el.setAttribute("hidden", "")
    else el.removeAttribute("hidden")
  }

  function isOpen() {
    return document.documentElement.classList.contains(OPEN_CLASS)
  }

  function focusClose() {
    if (!closeButtonEl) return
    closeButtonEl.focus()
  }

  function openMenu() {
    if (!menuEl || isOpen()) return

    lastFocusedEl = document.activeElement
    document.documentElement.classList.add(OPEN_CLASS)
    setHidden(menuEl, false)
    syncVisualTextGeometry()
    focusClose()
  }

  function closeMenu() {
    if (!menuEl || !isOpen()) return

    setHidden(menuEl, true)
    hideVisualText()
    document.documentElement.classList.remove(OPEN_CLASS)

    if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
      lastFocusedEl.focus()
      return
    }

    if (sourceTriggerEl) sourceTriggerEl.focus()
  }

  function toggleMenu() {
    if (isOpen()) closeMenu()
    else openMenu()
  }

  function onTriggerClick(e) {
    e.preventDefault()
    toggleMenu()
  }

  function onCloseClick() {
    closeMenu()
  }

  function onKeyDown(e) {
    if (e.key === "Escape") closeMenu()
  }

  function onMenuLinkClick(e) {
    var link = e.target && e.target.closest ? e.target.closest(LINK_SELECTOR) : null
    if (!link) return

    closeMenu()
  }

  function onResize() {
    scheduleGeometryFrame()
  }

  function init() {
    menuEl = document.querySelector(MENU_SELECTOR)
    closeButtonEl = document.querySelector(CLOSE_SELECTOR)
    sourceTriggerEl = document.querySelector(TRIGGER_SELECTOR)
    hitTriggerEl = getHitCloneForMobileTrigger()

    if (!menuEl || !closeButtonEl || !sourceTriggerEl) return

    buildVisualTextLayer()

    sourceTriggerEl.addEventListener("click", onTriggerClick)
    if (hitTriggerEl) hitTriggerEl.addEventListener("click", onTriggerClick)

    closeButtonEl.addEventListener("click", onCloseClick)
    document.addEventListener("keydown", onKeyDown)
    menuEl.addEventListener("click", onMenuLinkClick)
    window.addEventListener("resize", onResize, { passive: true })

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        scheduleGeometryFrame()
      })
    }
  }

  init()
})()
