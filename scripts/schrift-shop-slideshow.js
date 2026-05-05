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

