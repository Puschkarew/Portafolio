;(() => {
  const loadedClass = 'is-loaded'
  const errorClass = 'is-error'
  const handledRoots = new WeakSet()

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

  const waitForNextPaint = () =>
    new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve)
      })
    })

  const revealWhenReady = async (root, full) => {
    if (!full.naturalWidth) {
      markError(root)
      return
    }

    if (typeof full.decode === 'function') {
      try {
        await full.decode()
      } catch {
        if (!full.naturalWidth) {
          markError(root)
          return
        }
      }
    }

    await waitForNextPaint()
    markLoaded(root)
  }

  const handleOne = (root) => {
    if (!root || handledRoots.has(root)) return
    handledRoots.add(root)

    const full = getFullImage(root)
    if (!full) return

    if (full.complete && full.naturalWidth > 0) {
      void revealWhenReady(root, full)
      return
    }

    if (full.complete) {
      markError(root)
      return
    }

    full.addEventListener(
      'load',
      () => {
        void revealWhenReady(root, full)
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
    slideshowRoots.forEach(handleOne)

    if (typeof IntersectionObserver !== 'function') {
      roots.forEach(handleOne)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          observer.unobserve(entry.target)
          handleOne(entry.target)
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
