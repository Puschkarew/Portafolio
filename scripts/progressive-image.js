;(() => {
  const loadedClass = 'is-loaded'

  const getFullImage = (root) => {
    if (!root) return null
    if (root.tagName === 'IMG') return root
    return root.querySelector('.pimg__full')
  }

  const markLoaded = (root) => {
    if (!root) return
    root.classList.add(loadedClass)
  }

  const handleOne = async (root) => {
    const full = getFullImage(root)
    if (!full) return

    if (full.complete && full.naturalWidth > 0) {
      markLoaded(root)
      return
    }

    const onDone = () => markLoaded(root)
    full.addEventListener('load', onDone, { once: true })
    full.addEventListener('error', onDone, { once: true })

    if (typeof full.decode === 'function') {
      try {
        await full.decode()
        markLoaded(root)
      } catch {
        // Ignore decode failures; load/error still resolve state
      }
    }
  }

  const init = () => {
    const roots = Array.from(document.querySelectorAll('[data-progressive-image="true"]'))
    roots.forEach((root) => {
      void handleOne(root)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true })
  } else {
    init()
  }
})()

