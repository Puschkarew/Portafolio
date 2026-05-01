(() => {
  const manualRevealSelector = '[data-reveal="scale"]'
  const caseMediaSelector = [
    ".case-hero .case-hero__media",
    ".case-content .case-media-grid__feature",
    ".case-content .case-media-grid__panel",
    ".case-content .case-reference-illustration",
    ".case-content .case-reference-item",
    ".case-content .case-reference-poster__frame",
    ".case-content .case-editorial-gallery__item",
    ".case-content .case-editorial-gallery__detail",
    ".case-content .mybox-media",
    ".case-content .mybox-token",
    ".case-content .mybox-collage__item",
    ".case-content .mezhdu-media",
    ".case-content .mezhdu-social-item",
    ".case-content .mezhdu-collage__media",
    ".case-content .mezhdu-details__art",
    ".case-content .case-details__art"
  ].join(", ")
  const autoRevealClass = "scroll-reveal-target"
  const revealedClass = "is-revealed"
  const activeClass = "has-scroll-reveal"
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

  function getRevealNodes() {
    const manualNodes = Array.from(document.querySelectorAll(manualRevealSelector))
    const caseMediaNodes = Array.from(document.querySelectorAll(caseMediaSelector))

    caseMediaNodes.forEach((node) => {
      node.classList.add(autoRevealClass)
    })

    return Array.from(new Set([...manualNodes, ...caseMediaNodes]))
  }

  function initScrollReveal() {
    const nodes = getRevealNodes()

    if (nodes.length === 0) {
      return
    }

    document.documentElement.classList.add(activeClass)

    nodes.forEach((node) => {
      const index = Array.prototype.indexOf.call(node.parentElement?.children || [], node)
      node.style.setProperty("--reveal-delay", `${Math.max(0, index % 4) * 70}ms`)
    })

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      nodes.forEach((node) => {
        node.classList.add(revealedClass)
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          entry.target.classList.add(revealedClass)
          observer.unobserve(entry.target)
        })
      },
      {
        rootMargin: "0px 0px -18% 0px",
        threshold: 0.01
      }
    )

    nodes.forEach((node) => {
      observer.observe(node)
    })
  }

  function scheduleScrollReveal() {
    requestAnimationFrame(initScrollReveal)
  }

  if (document.readyState === "complete") {
    scheduleScrollReveal()
  } else {
    window.addEventListener("load", scheduleScrollReveal, { once: true })
  }
})()
