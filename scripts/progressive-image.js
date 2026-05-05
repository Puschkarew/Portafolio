;(() => {
  const loadedClass = 'is-loaded'
  const errorClass = 'is-error'

  const getFullImage = (root) => {
    if (!root) return null
    if (root.tagName === 'IMG') return root
    return root.querySelector('.pimg__full')
  }

  const isSlideshowRoot = (root) => Boolean(root?.closest?.('[data-slideshow="schrift-shop"]'))

  const markLoaded = (root) => {
    if (!root) return
    root.classList.add(loadedClass)
  }

  const markError = (root) => {
    if (!root) return
    root.classList.add(errorClass)
  }

  const handleOne = async (root) => {
    const full = getFullImage(root)
    if (!full) return

    if (full.complete && full.naturalWidth > 0) {
      markLoaded(root)
      return
    }

    full.addEventListener(
      'load',
      () => {
        markLoaded(root)
      },
      { once: true }
    )
    full.addEventListener(
      'error',
      () => {
        markError(root)
      },
      { once: true }
    )
  }

  const init = () => {
    const roots = Array.from(document.querySelectorAll('[data-progressive-image="true"]'))
    if (roots.length === 0) return

    const slideshowRoots = roots.filter((root) => isSlideshowRoot(root))

    // Slideshow overlays keep all slides in the same viewport footprint,
    // but only the active one is visible. Load & mark slides immediately
    // so we don't flash the placeholder when switching.
    slideshowRoots.forEach((root) => void handleOne(root))

    if (typeof IntersectionObserver !== 'function') {
      roots.forEach((root) => void handleOne(root))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          observer.unobserve(entry.target)
          void handleOne(entry.target)
        })
      },
      {
        root: null,
        threshold: 0.01,
        rootMargin: '300px 0px'
      }
    )

    roots.forEach((root) => observer.observe(root))
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
})()

