;(() => {
  const ACTIVE_CLASS = 'is-active'
  const INTERVAL_MS = 1250

  const getSlides = (root) => Array.from(root.children).filter((node) => node?.matches?.('img, .pimg'))

  const setActive = (slides, idx, previousIdx = null) => {
    const next = slides[idx]
    if (!next) return

    next.classList.add(ACTIVE_CLASS)

    const rest = slides.filter((_, i) => i !== idx)
    if (previousIdx == null || previousIdx === idx) {
      rest.forEach((slide) => slide.classList.remove(ACTIVE_CLASS))
      return
    }

    // Avoid a blank frame: keep previous active for one frame.
    const previous = slides[previousIdx]
    requestAnimationFrame(() => {
      rest.forEach((slide) => slide.classList.remove(ACTIVE_CLASS))
      previous?.classList?.remove?.(ACTIVE_CLASS)
    })
  }

  const getSlideState = (slide) => {
    const isPimg = slide?.classList?.contains?.('pimg')
    const full = isPimg ? slide.querySelector?.('.pimg__full') : slide
    const placeholder = isPimg ? slide.querySelector?.('.pimg__placeholder') : null

    return {
      tag: slide?.tagName || null,
      className: slide?.className || null,
      isPimg,
      pimgLoaded: isPimg ? slide.classList.contains('is-loaded') : null,
      fullComplete: Boolean(full?.complete),
      fullNaturalWidth: full?.naturalWidth || 0,
      fullNaturalHeight: full?.naturalHeight || 0,
      fullCurrentSrc: full?.currentSrc || null,
      fullSrc: full?.getAttribute?.('src') || null,
      fullLoading: full?.getAttribute?.('loading') || null,
      fullDecoding: full?.getAttribute?.('decoding') || null,
      placeholderSrc: placeholder?.getAttribute?.('src') || null
    }
  }

  const isSlideReady = (slide) => {
    if (!slide) return false
    if (slide.classList?.contains?.('pimg')) {
      if (slide.classList.contains('is-loaded')) return true
      const full = slide.querySelector?.('.pimg__full')
      return Boolean(full?.complete && (full?.naturalWidth || 0) > 0)
    }

    return Boolean(slide.complete && (slide.naturalWidth || 0) > 0)
  }

  const ensurePimgLoadedClass = (slide) => {
    if (!slide?.classList?.contains?.('pimg')) return
    if (slide.classList.contains('is-loaded')) return
    if (!isSlideReady(slide)) return
    slide.classList.add('is-loaded')
  }

  const warmUpSlide = (slide) => {
    if (!slide) return
    if (slide.classList?.contains?.('pimg')) {
      const full = slide.querySelector?.('.pimg__full')
      if (!full) return
      try {
        if (full.loading) full.loading = 'eager'
      } catch {}
      try {
        full.fetchPriority = 'high'
      } catch {}
      return
    }

    try {
      if (slide.loading) slide.loading = 'eager'
    } catch {}
    try {
      slide.fetchPriority = 'high'
    } catch {}
  }

  const decodeSlide = async (slide) => {
    if (!slide) return
    if (slide.classList?.contains?.('pimg')) {
      const full = slide.querySelector?.('.pimg__full')
      if (!full?.decode) return
      try {
        await full.decode()
      } catch {}
      return
    }

    if (!slide.decode) return
    try {
      await slide.decode()
    } catch {}
  }

  const waitForReadySlides = async (slides, minReady) => {
    const ready = () => slides.filter(isSlideReady).length
    if (ready() >= minReady) return

    await new Promise((resolve) => {
      let done = false
      const finish = () => {
        if (done) return
        done = true
        resolve()
      }

      const onUpdate = () => {
        if (ready() >= minReady) finish()
      }

      const cleanup = []
      slides.forEach((slide) => {
        if (slide?.classList?.contains?.('pimg')) {
          const full = slide.querySelector?.('.pimg__full')
          if (!full) return
          full.addEventListener('load', onUpdate, { once: true })
          full.addEventListener('error', onUpdate, { once: true })
          cleanup.push(() => {
            full.removeEventListener('load', onUpdate)
            full.removeEventListener('error', onUpdate)
          })
          return
        }

        slide?.addEventListener?.('load', onUpdate, { once: true })
        slide?.addEventListener?.('error', onUpdate, { once: true })
        cleanup.push(() => {
          slide?.removeEventListener?.('load', onUpdate)
          slide?.removeEventListener?.('error', onUpdate)
        })
      })

      // Fallback: if images are cached, events might not fire.
      window.setTimeout(() => finish(), 2500)
      onUpdate()
    })
  }

  const waitForAllSlidesReady = async (slides) => {
    await waitForReadySlides(slides, slides.length)
  }

  const initSlideshow = (root) => {
    if (!root) return
    if (root.dataset.slideshowInit === 'true') {
      return
    }
    root.dataset.slideshowInit = 'true'
    const slides = getSlides(root)
    if (slides.length <= 1) return

    let activeIdx = 0

    slides.forEach(warmUpSlide)

    // Ensure the first paint is not a "not ready" slide.
    const boot = async () => {
      // Show the first slide as soon as it's ready.
      await waitForReadySlides(slides, 1)
      if (!isSlideReady(slides[0])) {
        const firstReady = slides.findIndex(isSlideReady)
        activeIdx = firstReady >= 0 ? firstReady : 0
      }

      ensurePimgLoadedClass(slides[activeIdx])
      setActive(slides, activeIdx)

      // Do not rotate until every slide is fully loaded.
      await waitForAllSlidesReady(slides)

      // Pre-decode to avoid first-switch jank (complete != decoded).
      await Promise.all(slides.map((slide) => decodeSlide(slide)))

      window.setInterval(() => {
      const before = activeIdx
      const candidate = (activeIdx + 1) % slides.length
        // After allReady gate, candidates should always be ready.
      activeIdx = candidate
        ensurePimgLoadedClass(slides[activeIdx])
        setActive(slides, activeIdx, before)
      }, INTERVAL_MS)
    }

    void boot()
  }

  const init = () => {
    const roots = Array.from(document.querySelectorAll('[data-slideshow]'))
    roots.forEach((root) => initSlideshow(root))
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
})()
