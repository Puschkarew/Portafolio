const path = require("node:path")

const Image = require("@11ty/eleventy-img")

const normalizePathPrefix = (prefix) => {
  if (!prefix) return ""
  const raw = String(prefix)
  if (raw === "/") return ""
  const trimmed = raw.endsWith("/") ? raw.slice(0, -1) : raw
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`
}

const joinWithPrefix = (prefix, url) => {
  const normalizedPrefix = normalizePathPrefix(prefix)
  const rawUrl = String(url || "")
  if (!normalizedPrefix) return rawUrl
  if (!rawUrl.startsWith("/")) return rawUrl
  return `${normalizedPrefix}${rawUrl}`
}

const toLocalInputPath = (src) => {
  const raw = String(src)
  const normalized = raw.startsWith("/") ? raw.slice(1) : raw
  return path.join(__dirname, normalized)
}

const stripUrlSuffix = (src) => String(src).split("#")[0].split("?")[0]

const isSvgPath = (src) => String(src).toLowerCase().endsWith(".svg")
const isPngPath = (src) => String(src).toLowerCase().endsWith(".png")

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("assets")
  eleventyConfig.addPassthroughCopy("fonts")
  eleventyConfig.addPassthroughCopy("scripts")
  eleventyConfig.addPassthroughCopy("styles")
  eleventyConfig.setServerPassthroughCopyBehavior("passthrough")

  const urlFilter = eleventyConfig.getFilter?.("url")

  eleventyConfig.addNunjucksAsyncShortcode(
    "progressiveImage",
    async function (
      src,
      alt,
      width,
      height,
      imgClassName = "",
      wrapperClassName = "",
      loading = "",
      decoding = "",
      fetchpriority = "",
      extraAttrs = ""
    ) {
      if (!src) {
        throw new Error("progressiveImage: missing src")
      }

      const pathPrefix = this?.ctx?.eleventy?.pathPrefix
      const withPathPrefix = (url) => {
        const resolved = String(url || "")
        if (typeof urlFilter === "function") return urlFilter(resolved)
        return joinWithPrefix(pathPrefix, resolved)
      }

      const resolvedAlt = alt ?? ""
      const resolvedWrapperClassName = wrapperClassName ? ` ${wrapperClassName}` : ""
      const resolvedImgClassName = imgClassName ? ` ${imgClassName}` : ""

      const numericWidth = width ? Number(width) : undefined
      const numericHeight = height ? Number(height) : undefined

      const outputDir = path.join(__dirname, "dist", "assets", "img")
      const urlPath = "/assets/img"

      // sharp: avoid AVIF/WebP failures on huge sources
      const allowAvif = Boolean(
        numericWidth &&
          numericHeight &&
          numericWidth <= 4096 &&
          numericHeight <= 4096 &&
          numericWidth * numericHeight <= 16_000_000
      )
      const allowTranscodedFull = Boolean(
        numericWidth &&
          numericHeight &&
          numericWidth <= 8192 &&
          numericHeight <= 8192 &&
          numericWidth * numericHeight <= 30_000_000
      )

      // SVG: no raster placeholder; just opt into runtime fade-in
      if (isSvgPath(src)) {
        const fullUrl = withPathPrefix(String(src))
        const fullAttrs = [
          `src="${fullUrl}"`,
          `alt="${String(resolvedAlt).replaceAll('"', "&quot;")}"`,
          numericWidth ? `width="${numericWidth}"` : "",
          numericHeight ? `height="${numericHeight}"` : "",
          loading ? `loading="${loading}"` : "",
          decoding ? `decoding="${decoding}"` : "",
          fetchpriority ? `fetchpriority="${fetchpriority}"` : "",
          `class="pimg__full${resolvedImgClassName}"`,
          `data-progressive-image="true"`,
          `data-progressive-solo="true"`,
          extraAttrs || ""
        ]
          .filter(Boolean)
          .join(" ")

        return `<img ${fullAttrs} />`
      }

      const srcWithoutSuffix = stripUrlSuffix(String(src))
      const inputPath = toLocalInputPath(srcWithoutSuffix)

      const placeholderStats = await Image(inputPath, {
        widths: [24],
        formats: ["webp"],
        outputDir,
        urlPath,
        sharpWebpOptions: { quality: 30 }
      })
      const placeholder = Object.values(placeholderStats)[0]?.[0]
      const placeholderUrl = placeholder?.url ? withPathPrefix(placeholder.url) : ""

      if (!allowTranscodedFull) {
        const fullUrl = withPathPrefix(String(src))
        const fullAttrs = [
          `src="${fullUrl}"`,
          `alt="${String(resolvedAlt).replaceAll('"', "&quot;")}"`,
          numericWidth ? `width="${numericWidth}"` : "",
          numericHeight ? `height="${numericHeight}"` : "",
          loading ? `loading="${loading}"` : "",
          decoding ? `decoding="${decoding}"` : "",
          fetchpriority ? `fetchpriority="${fetchpriority}"` : "",
          `class="pimg__full${resolvedImgClassName}"`,
          extraAttrs || ""
        ]
          .filter(Boolean)
          .join(" ")

        return `
<span class="pimg${resolvedWrapperClassName}" data-progressive-image="true">
  ${placeholderUrl ? `<img class="pimg__placeholder" src="${placeholderUrl}" alt="" aria-hidden="true" decoding="async" />` : ""}
  <img ${fullAttrs} />
</span>`.trim()
      }

      const fullFormats = isPngPath(src)
        ? [allowAvif ? "avif" : null, "webp", "png"].filter(Boolean)
        : [allowAvif ? "avif" : null, "webp", "jpeg"].filter(Boolean)

      const fullStats = await Image(inputPath, {
        widths: numericWidth ? [numericWidth] : [null],
        formats: fullFormats,
        outputDir,
        urlPath
      })

      const sources = []
      for (const format of ["avif", "webp"]) {
        const entry = fullStats[format]?.[0]
        if (!entry) continue
        sources.push(`<source type="${entry.sourceType}" srcset="${withPathPrefix(entry.url)}" />`)
      }

      const fallbackFormat = isPngPath(src) ? "png" : "jpeg"
      const fallback = fullStats[fallbackFormat]?.[0] ?? Object.values(fullStats).flat()[0]
      const fallbackUrl = fallback?.url ? withPathPrefix(fallback.url) : withPathPrefix(String(src))

      const fullAttrs = [
        `src="${fallbackUrl}"`,
        `alt="${String(resolvedAlt).replaceAll('"', "&quot;")}"`,
        numericWidth ? `width="${numericWidth}"` : "",
        numericHeight ? `height="${numericHeight}"` : "",
        loading ? `loading="${loading}"` : "",
        decoding ? `decoding="${decoding}"` : "",
        fetchpriority ? `fetchpriority="${fetchpriority}"` : "",
        `class="pimg__full${resolvedImgClassName}"`,
        extraAttrs || ""
      ]
        .filter(Boolean)
        .join(" ")

      return `
<span class="pimg${resolvedWrapperClassName}" data-progressive-image="true">
  ${placeholderUrl ? `<img class="pimg__placeholder" src="${placeholderUrl}" alt="" aria-hidden="true" decoding="async" />` : ""}
  <picture class="pimg__picture">
    ${sources.join("\n    ")}
    <img ${fullAttrs} />
  </picture>
</span>`.trim()
    }
  )

  return {
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      layouts: "_layouts",
      data: "_data"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
    templateFormats: ["html", "md", "njk"]
  }
}
