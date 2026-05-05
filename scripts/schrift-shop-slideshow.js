;(() => {
  const ACTIVE_CLASS = 'is-active'
  const INTERVAL_MS = 1250

  const getSlides = (root) => Array.from(root.children).filter((node) => node?.matches?.('img, .pimg'))

  const setActive = (slides, idx) => {
    slides.forEach((slide, i) => {
      if (i === idx) slide.classList.add(ACTIVE_CLASS)
      else slide.classList.remove(ACTIVE_CLASS)
    })
  }

  const initSlideshow = (root) => {
    if (!root) return
    const slides = getSlides(root)
    if (slides.length <= 1) return

    let activeIdx = Math.max(
      0,
      slides.findIndex((node) => node.classList?.contains(ACTIVE_CLASS))
    )

    setActive(slides, activeIdx)

    window.setInterval(() => {
      activeIdx = (activeIdx + 1) % slides.length
      setActive(slides, activeIdx)
    }, INTERVAL_MS)
  }

  const init = () => {
    const roots = Array.from(document.querySelectorAll('[data-slideshow="schrift-shop"]'))
    roots.forEach((root) => initSlideshow(root))
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
})()

(() => {
  const intervalMs = 1250
  const activeClass = "is-active"

  const setActive = (slides, activeIndex) => {
    slides.forEach((slide, index) => {
      slide.classList.toggle(activeClass, index === activeIndex)
    })
  }

  const initSlideshow = (root) => {
    const slides = Array.from(root.querySelectorAll("img"))
    if (slides.length < 2) return

    let index = slides.findIndex((slide) => slide.classList.contains(activeClass))
    if (index < 0) index = 0
    setActive(slides, index)

    window.setInterval(() => {
      index = (index + 1) % slides.length
      setActive(slides, index)
    }, intervalMs)
  }

  const init = () => {
    const roots = Array.from(document.querySelectorAll('[data-slideshow="schrift-shop"]'))
    if (roots.length === 0) return
    roots.forEach(initSlideshow)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true })
  } else {
    init()
  }
})()

