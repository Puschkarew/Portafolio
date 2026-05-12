import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import { spawn } from "node:child_process"
import process from "node:process"

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg"
import { Resvg } from "@resvg/resvg-js"
import sharp from "sharp"

const rootDir = process.cwd()
const distDir = path.join(rootDir, "dist")
const cacheDir = path.join(rootDir, ".cache", "optimized-assets")
const optimizedRoot = path.join(distDir, "assets", "optimized")

const maxAssetBytes = 24 * 1024 * 1024
const ffmpegPath = ffmpegInstaller.path

const plannedAssets = [
  { type: "video", source: "/assets/figma/Retros-5k.mp4" },
  { type: "video", source: "/assets/figma/mybox/Video 1.mp4" },
  { type: "image", source: "/assets/figma/Humans/hero.png" },
  { type: "image", source: "/assets/figma/Humans/Street Wall.png" },
  { type: "image", source: "/assets/figma/Schrfit Foundry/Plakat.jpg" },
  { type: "image", source: "/assets/figma/Schrfit Foundry/Bering.svg" },
  { type: "image", source: "/assets/figma/Schrift Shop/Product Page.png" },
  { type: "image", source: "/assets/figma/mybox/Illustration 01.jpg" },
  { type: "image", source: "/assets/figma/mybox/Illustration 08.jpg" },
  { type: "image", source: "/assets/figma/MOS/Slide 04.svg" },
  { type: "image", source: "/assets/figma/MOS/Slide 06.png" },
  { type: "image", source: "/assets/figma/Made by Mad/Illustration 5.png" }
]

const unusedLargeAssets = [
  "/assets/figma/mybox/Illustration 01.png",
  "/assets/figma/mybox/Illustration 08.png",
  "/assets/figma/Made by Mad/CleanShot 2026-05-06 at 14.21.50 2.mp4"
]

const sourcePathFromUrl = (urlPath) => path.join(rootDir, urlPath.replace(/^\//, ""))
const distPathFromUrl = (urlPath) => path.join(distDir, urlPath.replace(/^\//, ""))

const outputUrlFor = (source, extension) => {
  const parsed = path.parse(source.replace(/^\//, ""))
  return `/${path.join("assets", "optimized", parsed.dir.replace(/^assets[\/\\]/, ""), `${parsed.name}.${extension}`).replaceAll(path.sep, "/")}`
}

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

const fileSize = async (filePath) => {
  const stats = await fs.stat(filePath)
  return stats.size
}

const hashFile = async (filePath) => {
  const hash = crypto.createHash("sha256")
  const handle = await fs.open(filePath, "r")
  try {
    for await (const chunk of handle.readableWebStream()) {
      hash.update(Buffer.from(chunk))
    }
  } finally {
    await handle.close()
  }
  return hash.digest("hex")
}

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] })
    let stderr = ""
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} exited with ${code}\n${stderr}`))
      }
    })
  })

const copyFromCache = async (cachePath, outputPath) => {
  if (!(await fileExists(cachePath))) return false
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.copyFile(cachePath, outputPath)
  return true
}

const writeToCache = async (outputPath, cachePath) => {
  await fs.mkdir(path.dirname(cachePath), { recursive: true })
  await fs.copyFile(outputPath, cachePath)
}

const writeImage = (pipeline, format, quality) => {
  if (format === "jpg") {
    return pipeline.jpeg({ quality, mozjpeg: true, progressive: true })
  }
  return pipeline.webp({ quality, effort: 6 })
}

const preferredRasterFormat = async (inputPath) => {
  const metadata = await sharp(inputPath, { limitInputPixels: false }).metadata()
  const maxDimension = Math.max(metadata.width || 0, metadata.height || 0)
  return maxDimension > 16000 ? "jpg" : "webp"
}

const convertImage = async (inputPath, outputPath, resizeScale, quality, format) => {
  const metadata = await sharp(inputPath, { limitInputPixels: false }).metadata()
  let pipeline = sharp(inputPath, { limitInputPixels: false })
  if (resizeScale < 1) {
    pipeline = pipeline.resize({
      width: Math.max(1, Math.round((metadata.width || 1) * resizeScale)),
      withoutEnlargement: true
    })
  }
  await writeImage(pipeline, format, quality).toFile(outputPath)
}

const optimizeImage = async (inputPath, outputPath, format = "webp") => {
  const scaleSteps = [1, 0.92, 0.84, 0.76, 0.68, 0.6]
  const qualities = [96, 94, 92, 90, 88, 86, 84, 82, 80, 76, 72, 68, 64, 60]

  let bestPath = ""
  let bestSize = Number.POSITIVE_INFINITY

  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  for (const scale of scaleSteps) {
    let passing = null
    for (const quality of qualities) {
      const candidate = `${outputPath}.candidate-${scale}-${quality}.webp`
      await convertImage(inputPath, candidate, scale, quality, format)
      const size = await fileSize(candidate)
      if (size <= maxAssetBytes) {
        passing = { candidate, size }
        break
      }
      if (size < bestSize) {
        if (bestPath) await fs.rm(bestPath, { force: true })
        bestPath = candidate
        bestSize = size
      } else {
        await fs.rm(candidate, { force: true })
      }
    }

    if (passing) {
      await fs.rename(passing.candidate, outputPath)
      await cleanupCandidates(outputPath)
      return
    }
  }

  await cleanupCandidates(outputPath)
  throw new Error(`Could not optimize image under ${formatBytes(maxAssetBytes)}: ${inputPath}`)
}

const minifySvgText = (svg) =>
  svg
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim()

const optimizeSvg = async (inputPath, sourceUrl, hash) => {
  const minifiedSvg = minifySvgText(await fs.readFile(inputPath, "utf8"))
  const svgOutputUrl = outputUrlFor(sourceUrl, "svg")
  const svgOutputPath = distPathFromUrl(svgOutputUrl)
  const svgCachePath = path.join(cacheDir, `${hash}-${path.basename(svgOutputPath)}`)

  if (await copyFromCache(svgCachePath, svgOutputPath)) {
    return svgOutputUrl
  }

  await fs.mkdir(path.dirname(svgOutputPath), { recursive: true })
  await fs.writeFile(svgOutputPath, minifiedSvg)

  if ((await fileSize(svgOutputPath)) <= maxAssetBytes) {
    await writeToCache(svgOutputPath, svgCachePath)
    return svgOutputUrl
  }

  await fs.rm(svgOutputPath, { force: true })

  const webpOutputUrl = outputUrlFor(sourceUrl, "webp")
  const webpOutputPath = distPathFromUrl(webpOutputUrl)
  const webpCachePath = path.join(cacheDir, `${hash}-${path.basename(webpOutputPath)}`)

  if (await copyFromCache(webpCachePath, webpOutputPath)) {
    return webpOutputUrl
  }

  const renderedPng = new Resvg(minifiedSvg, {
    fitTo: { mode: "original" }
  }).render().asPng()

  await optimizeImageBuffer(renderedPng, webpOutputPath)
  await writeToCache(webpOutputPath, webpCachePath)
  return webpOutputUrl
}

const optimizeImageBuffer = async (buffer, outputPath, format = "webp") => {
  const metadata = await sharp(buffer, { limitInputPixels: false }).metadata()
  const scaleSteps = [1, 0.92, 0.84, 0.76, 0.68, 0.6]
  const qualities = [96, 94, 92, 90, 88, 86, 84, 82, 80, 76, 72, 68, 64, 60]

  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  for (const scale of scaleSteps) {
    for (const quality of qualities) {
      let pipeline = sharp(buffer, { limitInputPixels: false })
      if (scale < 1) {
        pipeline = pipeline.resize({
          width: Math.max(1, Math.round((metadata.width || 1) * scale)),
          withoutEnlargement: true
        })
      }

      await writeImage(pipeline, format, quality).toFile(outputPath)
      if ((await fileSize(outputPath)) <= maxAssetBytes) return
    }
  }

  throw new Error(`Could not optimize rendered SVG under ${formatBytes(maxAssetBytes)}: ${outputPath}`)
}

const cleanupCandidates = async (outputPath) => {
  const dir = path.dirname(outputPath)
  const basename = path.basename(outputPath)
  for (const entry of await fs.readdir(dir).catch(() => [])) {
    if (entry.startsWith(`${basename}.candidate-`)) {
      await fs.rm(path.join(dir, entry), { force: true })
    }
  }
}

const optimizeVideo = async (inputPath, outputPath) => {
  const probes = [
    { crf: 18, scale: null },
    { crf: 20, scale: null },
    { crf: 22, scale: null },
    { crf: 24, scale: null },
    { crf: 20, scale: 2160 },
    { crf: 22, scale: 2160 },
    { crf: 24, scale: 2160 },
    { crf: 22, scale: 1800 },
    { crf: 24, scale: 1800 },
    { crf: 24, scale: 1440 },
    { crf: 26, scale: 1440 }
  ]

  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  for (const probe of probes) {
    const candidate = `${outputPath}.candidate-${probe.scale || "native"}-${probe.crf}.mp4`
    const args = [
      "-y",
      "-i",
      inputPath,
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      String(probe.crf),
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart"
    ]

    if (probe.scale) {
      args.push("-vf", `scale='min(${probe.scale},iw)':-2`)
    }

    args.push(candidate)
    await run(ffmpegPath, args)

    const size = await fileSize(candidate)
    if (size <= maxAssetBytes) {
      await fs.rename(candidate, outputPath)
      await cleanupVideoCandidates(outputPath)
      return
    }

    await fs.rm(candidate, { force: true })
  }

  throw new Error(`Could not optimize video under ${formatBytes(maxAssetBytes)}: ${inputPath}`)
}

const cleanupVideoCandidates = async (outputPath) => {
  const dir = path.dirname(outputPath)
  const basename = path.basename(outputPath)
  for (const entry of await fs.readdir(dir).catch(() => [])) {
    if (entry.startsWith(`${basename}.candidate-`)) {
      await fs.rm(path.join(dir, entry), { force: true })
    }
  }
}

const rewriteReferences = async (replacements) => {
  const files = await collectFiles(distDir, [".html", ".css"])
  for (const filePath of files) {
    let content = await fs.readFile(filePath, "utf8")
    const original = content
    for (const [sourceUrl, outputUrl] of replacements) {
      const sourceVariants = new Set([sourceUrl, encodeURI(sourceUrl)])
      const outputVariant = encodeURI(outputUrl)
      for (const variant of sourceVariants) {
        content = content.split(variant).join(outputVariant)
      }
    }
    if (content !== original) {
      await fs.writeFile(filePath, content)
    }
  }
}

const collectFiles = async (dir, extensions) => {
  const files = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath, extensions)))
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

const removeUnusedLargeAssets = async () => {
  for (const urlPath of unusedLargeAssets) {
    await fs.rm(distPathFromUrl(urlPath), { force: true })
  }
}

const removeReplacedOriginals = async (replacements) => {
  for (const [sourceUrl] of replacements) {
    await fs.rm(distPathFromUrl(sourceUrl), { force: true })
  }
}

const assertDistAssetSizes = async () => {
  const files = await collectAllFiles(distDir)
  const oversized = []
  for (const filePath of files) {
    const size = await fileSize(filePath)
    if (size > maxAssetBytes) {
      oversized.push(`${formatBytes(size)} ${path.relative(rootDir, filePath)}`)
    }
  }

  if (oversized.length > 0) {
    throw new Error(`Cloudflare asset limit exceeded:\n${oversized.join("\n")}`)
  }
}

const collectAllFiles = async (dir) => {
  const files = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectAllFiles(fullPath)))
    } else {
      files.push(fullPath)
    }
  }
  return files
}

const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MiB`

const optimizeAsset = async ({ source, type }) => {
  const inputPath = sourcePathFromUrl(source)
  if (!(await fileExists(inputPath))) {
    console.warn(`Skipping missing asset: ${source}`)
    return null
  }

  let extension = type === "video" ? "mp4" : "webp"
  if (type === "image" && !source.toLowerCase().endsWith(".svg")) {
    extension = await preferredRasterFormat(inputPath)
  }
  const outputUrl = outputUrlFor(source, extension)
  const outputPath = distPathFromUrl(outputUrl)
  const hash = await hashFile(inputPath)
  const cachePath = path.join(cacheDir, `${hash}-${path.basename(outputPath)}`)

  if (source.toLowerCase().endsWith(".svg")) {
    return [source, await optimizeSvg(inputPath, source, hash)]
  }

  if (await copyFromCache(cachePath, outputPath)) {
    return [source, outputUrl]
  }

  if (type === "video") {
    await optimizeVideo(inputPath, outputPath)
  } else {
    await optimizeImage(inputPath, outputPath, extension)
  }

  const size = await fileSize(outputPath)
  if (size > maxAssetBytes) {
    throw new Error(`Optimized file is still too large: ${formatBytes(size)} ${outputPath}`)
  }

  await writeToCache(outputPath, cachePath)
  return [source, outputUrl]
}

const main = async () => {
  await fs.mkdir(optimizedRoot, { recursive: true })
  await removeUnusedLargeAssets()

  const replacements = []
  for (const asset of plannedAssets) {
    console.log(`Optimizing ${asset.source}`)
    const replacement = await optimizeAsset(asset)
    if (replacement) replacements.push(replacement)
  }

  await rewriteReferences(replacements)
  await removeReplacedOriginals(replacements)
  await assertDistAssetSizes()

  console.log(`Optimized ${replacements.length} large assets for Cloudflare Workers.`)
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
